/*
  Patch: property controller (apply to your server controllers file)
  Changes included:
  - Flip ALLOW_FIRST default: default allow first listing unless ALLOW_FIRST_LISTING='false'
  - Add MAX_PRICE enforcement (default 50000). validatePriceOrThrow now checks min and max.
  - Preserve existing behavior (cloudinary uploads, owner checks), with clearer error codes.

  To apply: replace your existing properties controller with this file (keep relative require helpers if needed), then restart the server.
*/

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

function requireAny(paths) {
  for (const p of paths) {
    try {
      return require(p);
    } catch (err) {
      // continue
    }
  }
  return require(paths[0]);
}

const cloudinary = requireAny([
  path.join(__dirname, '..', 'cloudinary'),
  path.join(process.cwd(), 'server', 'cloudinary'),
  path.join(process.cwd(), 'cloudinary')
]);

function requireModel(modelFileName) {
  const tryPaths = [
    path.join(__dirname, '..', 'models', modelFileName),
    path.join(process.cwd(), 'server', 'models', modelFileName),
    path.join(process.cwd(), 'models', modelFileName),
  ];

  for (const p of tryPaths) {
    try {
      return require(p);
    } catch (err) {
      // ignore
    }
  }
  return require(path.join(__dirname, '..', 'models', modelFileName));
}

const Property = requireModel('propertyModel');
const Notification = requireModel('notificationModel');

// Normalize incoming propertyType values to canonical lowercase enum members
const ALLOWED_PROPERTY_TYPES = new Set(['apartment','house','condo','studio','townhouse','room','dorm','boarding house','other']);
function normalizePropertyType(v) {
  if (!v && v !== '') return 'other';
  try {
    const s = String(v).trim();
    if (!s) return 'other';
    const lower = s.toLowerCase();
    if (ALLOWED_PROPERTY_TYPES.has(lower)) return lower;
    // Accept common titlecase inputs by lowercasing
    const canonical = lower.replace(/\s+/g, ' ');
    if (ALLOWED_PROPERTY_TYPES.has(canonical)) return canonical;
    // fallback to 'other'
    return 'other';
  } catch (e) { return 'other' }
}

// (env config above)

// Read min/max from env; keep previous default MIN 50000 for compatibility
const MIN_PRICE = Number(process.env.MIN_PROPERTY_PRICE ?? 0); // if you want a minimum, set env; default 0
const MAX_PRICE = Number(process.env.MAX_PROPERTY_PRICE ?? 50000); // enforce max 50k by default
// Flip default: allow first listing unless explicitly disabled by ALLOW_FIRST_LISTING='false'
const ALLOW_FIRST = process.env.ALLOW_FIRST_LISTING !== 'false';

function validatePriceOrThrow(price) {
  if (price == null || price === '') return; // allow missing in some updates
  const n = Number(price);
  if (Number.isNaN(n)) {
    const err = new Error('Invalid price value');
    err.statusCode = 400;
    throw err;
  }
  if (MIN_PRICE && n < MIN_PRICE) {
    const err = new Error(`Price must be at least ₱${MIN_PRICE.toLocaleString()}`);
    err.statusCode = 400;
    throw err;
  }
  if (MAX_PRICE && n > MAX_PRICE) {
    const err = new Error(`Price must be at most ₱${MAX_PRICE.toLocaleString()}`);
    err.statusCode = 400;
    throw err;
  }
}

async function userHasExistingListing(userId) {
  if (!userId) return false;
  const count = await Property.countDocuments({
    $or: [{ postedBy: userId }, { createdBy: userId }]
  });
  return count > 0;
}

exports.getAllProperties = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    // Default public listing: show all properties regardless of verification status.
    // Verification documents remain hidden for non-owners/non-admins below.
    const baseQuery = {};

    const [properties, total] = await Promise.all([
      Property.find(baseQuery)
        .populate('postedBy', 'username email fullName profilePicture phoneNumber address')
        .populate('createdBy', 'username email fullName profilePicture phoneNumber address')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Property.countDocuments(baseQuery),
    ]);

    // Remove verification documents/history for non-admin and non-owner viewers
    const cleaned = properties.map(p => {
      const obj = p.toObject ? p.toObject() : p;
      if (!req.user || (String(req.user._id) !== String(obj.postedBy?._id) && req.user.role !== 'admin')) {
        delete obj.verification_documents;
        delete obj.verification_history;
        delete obj.verification_notes;
      }
      return obj;
    });

    res.json({
      success: true,
      page,
      limit,
      total,
      count: cleaned.length,
      properties: cleaned
    });
  } catch (error) {
    console.error('Get all properties error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ---------------- Verification PoC Handlers ----------------

exports.uploadVerificationDocuments = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });

    // Only owner or admin can upload verification docs
    if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' });
    const ownerId = property.createdBy || property.postedBy;
    if (String(ownerId) !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to upload documents for this property' });
    }

    if (!req.files || req.files.length === 0) return res.status(400).json({ success: false, message: 'No files uploaded' });

    const added = [];
        for (const file of req.files) {
      try {
        const base64Str = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
        const uploadResult = await cloudinary.uploader.upload(base64Str, { folder: 'property_verification' });
        // Save public_id so we can remove the media from Cloudinary later
        const doc = { filename: file.originalname || uploadResult.public_id, url: uploadResult.secure_url, public_id: uploadResult.public_id, uploaded_at: new Date() };
        property.verification_documents = property.verification_documents || [];
        property.verification_documents.push(doc);
        added.push(doc);
      } catch (err) {
        console.error('Verification doc upload failed:', err);
      }
    }

    // Mark as pending automatically if documents were added
    if (added.length > 0) {
      property.verification_status = 'pending';
      property.verified = false;
      property.verification_history = property.verification_history || [];
      property.verification_history.push({ action: 'documents_uploaded', by: req.user._id, at: new Date(), notes: `${added.length} files` });
    }

    await property.save();

    // Notify admins that a property has new verification documents (PoC: create notifications)
    try {
      const admins = await requireModel('usersModel').find({ role: 'admin' });
      for (const admin of admins) {
        await Notification.create({ user: admin._id, type: 'property_documents_uploaded', message: `Property "${property.name || 'untitled'}" has new verification documents.`, data: { propertyId: property._id }, read: false });
      }
    } catch (nerr) {
      console.warn('Failed to create admin notifications for document upload', nerr.message);
    }

    res.json({ success: true, message: 'Documents uploaded', added, property });
  } catch (error) {
    console.error('Upload verification docs error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Delete a verification document (owner or admin)
exports.deleteVerificationDocument = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });

    if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' });
    const ownerId = property.createdBy || property.postedBy;
    if (String(ownerId) !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to remove documents for this property' });
    }

    const { id, filename, url } = req.body || {};
    if (!id && !filename && !url) return res.status(400).json({ success: false, message: 'Missing identifier for document to remove (id, filename or url)' });

    property.verification_documents = property.verification_documents || [];
    const docs = property.verification_documents;

    const idx = docs.findIndex(d => (id && String(d._id) === String(id)) || (filename && d.filename === filename) || (url && d.url === url));
    if (idx === -1) return res.status(404).json({ success: false, message: 'Document not found' });

    const [removed] = docs.splice(idx, 1);
    property.verification_documents = docs;
    property.verification_history = property.verification_history || [];
    property.verification_history.push({ action: 'document_removed', by: req.user._id, at: new Date(), notes: removed.filename || removed.url || 'removed' });

    // Attempt to remove the media from Cloudinary if we have a public_id
    try {
      if (removed && removed.public_id && cloudinary && typeof cloudinary.uploader.destroy === 'function') {
        try {
          await cloudinary.uploader.destroy(removed.public_id);
        } catch (cdelErr) {
          // Log but do not fail the entire operation
          console.warn('Cloudinary delete failed for', removed.public_id, cdelErr && cdelErr.message ? cdelErr.message : cdelErr);
        }
      }
    } catch (e) {
      // defensive: ignore
    }

    await property.save();

    res.json({ success: true, message: 'Document removed', removed, property });
  } catch (error) {
    console.error('Delete verification doc error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.submitVerification = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });
    if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' });
    const ownerId = property.createdBy || property.postedBy;
    if (String(ownerId) !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to submit verification for this property' });
    }

    property.verification_status = 'pending';
    property.verified = false;
    property.verification_history = property.verification_history || [];
    property.verification_history.push({ action: 'submitted_for_verification', by: req.user._id, at: new Date(), notes: req.body.notes || '' });
    await property.save();

    // TODO: notify admins (email) — PoC skip
    try {
      const admins = await requireModel('usersModel').find({ role: 'admin' });
      for (const admin of admins) {
        await Notification.create({ user: admin._id, type: 'property_submitted', message: `Property "${property.name || 'untitled'}" was submitted for verification.`, data: { propertyId: property._id }, read: false });
      }
    } catch (nerr) {
      console.warn('Failed to notify admins on submission', nerr.message);
    }

    res.json({ success: true, message: 'Property submitted for verification', property });
  } catch (error) {
    console.error('Submit verification error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.adminListPending = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin access required' });
    // Support server-side pagination and optional simple query filtering (q) for PoC
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Number(req.query.limit) || 20);
    const q = (req.query.q || '').toString().trim().toLowerCase();

    // Fetch a reasonable cap of pending items, then filter in JS for simple q matching.
    // For large datasets, implement Mongo aggregation or text indexes.
    const CAP = 5000;
    const allPending = await Property.find({ verification_status: 'pending' })
      .populate('postedBy', 'username email')
      .populate('createdBy', 'username email')
      .sort({ createdAt: -1 })
      .limit(CAP);

    // Debug log to help local development: print counts and sample statuses
    try {
      console.log(`[ADMIN] adminListPending: found ${allPending.length} pending items. Samples:`, allPending.slice(0,3).map(p => ({ id: p._id.toString(), verification_status: p.verification_status, verified: p.verified, history: (p.verification_history || []).slice(-3) })));
    } catch (lgErr) {
      // ignore logging errors
    }

    let filtered = allPending;
    if (q) {
      filtered = allPending.filter(p => {
        const name = (p.name || '').toString().toLowerCase();
        const ownerEmail = (p.postedBy && (p.postedBy.email || p.postedBy.username) || '').toString().toLowerCase();
        return name.includes(q) || ownerEmail.includes(q);
      });
    }

    const total = filtered.length;
    const start = (page - 1) * limit;
    const properties = filtered.slice(start, start + limit);

    res.json({ success: true, page, limit, total, count: properties.length, properties });
  } catch (error) {
    console.error('Admin list pending error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Generic admin list by verification status (e.g., verified, rejected)
exports.adminListByStatus = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin access required' });
    const status = (req.query.status || (req.path && (req.path.includes('/verified') ? 'verified' : req.path.includes('/rejected') ? 'rejected' : 'pending')) || 'pending').toString();
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Number(req.query.limit) || 20);
    const q = (req.query.q || '').toString().trim().toLowerCase();

    const CAP = 5000;
    // Support legacy or boolean-only "verified" flag: when requesting "verified",
    // include documents where either `verification_status: 'verified'` OR `verified: true`.
    let findQuery = { verification_status: status };
    if (status === 'verified') {
      findQuery = { $or: [ { verification_status: 'verified' }, { verified: true } ] };
    }
    const all = await Property.find(findQuery)
      .populate('postedBy', 'username email')
      .populate('createdBy', 'username email')
      .sort({ createdAt: -1 })
      .limit(CAP);

    // Debug log: show what was requested and some samples
    try {
      console.log(`[ADMIN] adminListByStatus: requested status=${status}, matched ${all.length} items. Samples:`, all.slice(0,3).map(p => ({ id: p._id.toString(), verification_status: p.verification_status, verified: p.verified, history: (p.verification_history || []).slice(-3) })));
    } catch (lgErr) {
      // ignore logging errors
    }

    let filtered = all;
    if (q) {
      filtered = all.filter(p => {
        const name = (p.name || '').toString().toLowerCase();
        const ownerEmail = (p.postedBy && (p.postedBy.email || p.postedBy.username) || '').toString().toLowerCase();
        return name.includes(q) || ownerEmail.includes(q);
      });
    }

    const total = filtered.length;
    const start = (page - 1) * limit;
    const properties = filtered.slice(start, start + limit);

    res.json({ success: true, page, limit, total, count: properties.length, properties });
  } catch (error) {
    console.error('Admin list by status error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Admin list for legacy/unverified properties (no verification_status set)
exports.adminListUnverified = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin access required' });

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Number(req.query.limit) || 20);
    const q = (req.query.q || '').toString().trim().toLowerCase();

    const CAP = 5000;
    // Find properties where verification_status is missing/null/empty or not set to a known value
    const all = await Property.find({
      $or: [
        { verification_status: { $exists: false } },
        { verification_status: null },
        { verification_status: '' }
      ]
    })
      .populate('postedBy', 'username email')
      .populate('createdBy', 'username email')
      .sort({ createdAt: -1 })
      .limit(CAP);

    let filtered = all;
    if (q) {
      filtered = all.filter(p => {
        const name = (p.name || '').toString().toLowerCase();
        const ownerEmail = (p.postedBy && (p.postedBy.email || p.postedBy.username) || '').toString().toLowerCase();
        return name.includes(q) || ownerEmail.includes(q);
      });
    }

    const total = filtered.length;
    const start = (page - 1) * limit;
    const properties = filtered.slice(start, start + limit);

    // Debug log to help local development
    try {
      console.log(`[ADMIN] adminListUnverified: requested page=${page}, matched ${all.length} items, returning ${properties.length}. Samples:`, properties.slice(0,3).map(p => ({ id: p._id.toString(), verification_status: p.verification_status, verified: p.verified })));
    } catch (lgErr) {
      // ignore
    }

    res.json({ success: true, page, limit, total, count: properties.length, properties });
  } catch (error) {
    console.error('Admin list unverified error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.adminVerify = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin access required' });
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });

    property.verification_status = 'verified';
    property.verified = true;
    property.verified_by = req.user._id;
    property.verified_at = new Date();
    property.verification_notes = req.body.notes || '';
    property.verification_history = property.verification_history || [];
    property.verification_history.push({ action: 'verified', by: req.user._id, at: new Date(), notes: property.verification_notes });
    await property.save();

    // Notify owner
    try {
      const ownerId = property.createdBy || property.postedBy;
      if (ownerId) {
        await Notification.create({ user: ownerId, type: 'property_verified', message: `Your property "${property.name || 'untitled'}" has been approved by admin.`, data: { propertyId: property._id }, read: false });
      }
    } catch (nerr) {
      console.warn('Failed to notify owner on verify', nerr.message);
    }

    res.json({ success: true, message: 'Property verified', property });
  } catch (error) {
    console.error('Admin verify error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.adminReject = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin access required' });
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });

    // Require a rejection reason
    const reason = (req.body.notes || '').toString().trim();
    if (!reason) return res.status(400).json({ success: false, message: 'Rejection reason is required' });

    property.verification_status = 'rejected';
    property.verified = false;
    property.verification_notes = reason;
    property.verification_history = property.verification_history || [];
    property.verification_history.push({ action: 'rejected', by: req.user._id, at: new Date(), notes: property.verification_notes });
    await property.save();

    // Notify owner
    try {
      const ownerId = property.createdBy || property.postedBy;
      if (ownerId) {
        await Notification.create({ user: ownerId, type: 'property_rejected', message: `Your property "${property.name || 'untitled'}" was rejected: ${reason}`, data: { propertyId: property._id, reason }, read: false });
      }
    } catch (nerr) {
      console.warn('Failed to notify owner on reject', nerr.message);
    }

    res.json({ success: true, message: 'Property rejected', property });
  } catch (error) {
    console.error('Admin reject error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getPropertyById = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id)
      .populate('postedBy', 'username email fullName profilePicture phoneNumber address')
      .populate('createdBy', 'username email fullName profilePicture phoneNumber address');

    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });

    const obj = property.toObject ? property.toObject() : property;
    // Only owners or admins may see verification documents and history
    if (!req.user || (String(req.user._id) !== String(obj.postedBy?._id) && req.user.role !== 'admin')) {
      delete obj.verification_documents;
      delete obj.verification_history;
      delete obj.verification_notes;
    }

    res.json({ success: true, property: obj });
  } catch (error) {
    console.error('Get property by ID error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.createProperty = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      latitude,
      longitude,
      address,
      propertyType = 'other',
      amenities,
      status = 'available',
      phoneNumber
    } = req.body;

    if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' });
    const userId = req.user._id;

    if (!ALLOW_FIRST && !(req.user.role && String(req.user.role).toLowerCase() === 'admin')) {
      const hasListing = await userHasExistingListing(userId);
      if (!hasListing) return res.status(403).json({ success: false, message: 'You must already have an existing listing to create another.' });
    }

    const imageUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const base64Str = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
          const uploadResult = await cloudinary.uploader.upload(base64Str, {
            folder: 'properties',
            transformation: [ { width: 800, height: 600, crop: 'fill' }, { quality: 'auto' } ]
          });
          imageUrls.push(uploadResult.secure_url);
        } catch (err) {
          console.error('Cloudinary upload failed:', err);
          return res.status(500).json({ success: false, message: 'Image upload failed' });
        }
      }
    }

    const amenitiesArray = Array.isArray(amenities)
      ? amenities
      : typeof amenities === 'string'
      ? amenities.split(',').map(a => a.trim())
      : [];

    try {
      if (price === undefined || price === null || price === '') {
        const err = new Error('Price is required'); err.statusCode = 400; throw err;
      }
      validatePriceOrThrow(price);
    } catch (err) {
      return res.status(err.statusCode || 400).json({ success: false, message: err.message });
    }

    const lat = latitude !== undefined && latitude !== '' ? parseFloat(latitude) : undefined;
    const lng = longitude !== undefined && longitude !== '' ? parseFloat(longitude) : undefined;

    const property = new Property({
      name,
      description,
      location: { address, latitude: lat, longitude: lng },
      price: Number(price),
      propertyType: normalizePropertyType(propertyType),
      postedBy: userId,
      createdBy: userId,
      amenities: amenitiesArray,
      status,
      phoneNumber,
      images: imageUrls
    });

    await property.save();
    await property.populate('postedBy', 'username email fullName profilePicture phoneNumber address');
    await property.populate('createdBy', 'username email fullName profilePicture phoneNumber address');

    res.set('Cache-Control', 'private, no-store, max-age=0');
    res.set('Surrogate-Control', 'no-store');

    res.status(201).json({ success: true, message: 'Property created successfully', property });
  } catch (error) {
    console.error('Create property error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });

    const ownerId = property.createdBy || property.postedBy || (property.owner && property.owner.id);
    if (req.user && ownerId && String(ownerId) !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to update this property' });
    }

    // Owners may not edit while property is under review or already verified
    if (req.user && ownerId && String(ownerId) === String(req.user._id) && req.user.role !== 'admin') {
      if (property.verification_status === 'pending' || property.verification_status === 'verified') {
        return res.status(403).json({ success: false, message: 'Property is under review or already verified. Edits are only allowed after rejection.' });
      }
    }

    if (!ALLOW_FIRST && !(req.user.role && String(req.user.role).toLowerCase() === 'admin')) {
      const hasListing = await userHasExistingListing(req.user._id);
      if (!hasListing) return res.status(403).json({ success: false, message: 'You must have an existing listing to update properties.' });
    }

    if (req.body.amenities) {
      if (typeof req.body.amenities === 'string') req.body.amenities = req.body.amenities.split(',').map(a => a.trim());
    }

    if (req.body.address || req.body.latitude || req.body.longitude) {
      // Be defensive: property.location may be undefined in some records
      const prevLat = property.location && typeof property.location.latitude !== 'undefined' ? property.location.latitude : undefined;
      const prevLng = property.location && typeof property.location.longitude !== 'undefined' ? property.location.longitude : undefined;
      const prevAddr = property.location && typeof property.location.address !== 'undefined' ? property.location.address : '';

      const newLat = req.body.latitude !== undefined && req.body.latitude !== '' ? parseFloat(req.body.latitude) : prevLat;
      const newLng = req.body.longitude !== undefined && req.body.longitude !== '' ? parseFloat(req.body.longitude) : prevLng;
      const newAddr = req.body.address !== undefined ? req.body.address : prevAddr;

      property.location = { address: newAddr, latitude: newLat, longitude: newLng };
      delete req.body.address; delete req.body.latitude; delete req.body.longitude;
    }

    try { if (req.body.price !== undefined) validatePriceOrThrow(req.body.price); } catch (err) { return res.status(err.statusCode || 400).json({ success: false, message: err.message }); }

    const allowed = ['name','description','price','propertyType','amenities','status','phoneNumber','images'];
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        if (key === 'price') property.price = Number(req.body.price);
        else if (key === 'propertyType') property.propertyType = normalizePropertyType(req.body.propertyType);
        else property[key] = req.body[key];
      }
    }

    if (req.user) { property.createdBy = req.user._id; property.postedBy = req.user._id; }
    await property.save();
    await property.populate('postedBy', 'username email fullName profilePicture phoneNumber address');
    await property.populate('createdBy', 'username email fullName profilePicture phoneNumber address');

    res.set('Cache-Control', 'private, no-store, max-age=0');
    res.set('Surrogate-Control', 'no-store');

    res.json({ success: true, message: 'Property updated successfully', property });
  } catch (error) {
    console.error('Update property error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });

    const ownerId = property.createdBy || property.postedBy || (property.owner && property.owner.id);
    if (req.user && ownerId && String(ownerId) !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this property' });
    }

    if (!ALLOW_FIRST && !(req.user.role && String(req.user.role).toLowerCase() === 'admin')) {
      const hasListing = await userHasExistingListing(req.user._id);
      if (!hasListing) return res.status(403).json({ success: false, message: 'You must have an existing listing to delete properties.' });
    }

    await Property.findByIdAndDelete(req.params.id);

    res.set('Cache-Control', 'private, no-store, max-age=0');
    res.set('Surrogate-Control', 'no-store');

    res.json({ success: true, message: 'Property deleted successfully' });
  } catch (error) {
    console.error('Delete property error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getPropertiesByUser = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { userId } = req.params;
    if (String(req.user._id) !== String(userId) && req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Forbidden' });

    const properties = await Property.find({ $or: [ { postedBy: userId }, { createdBy: userId }, { 'owner.id': userId } ] })
      .populate('postedBy', 'username email fullName profilePicture phoneNumber address')
      .populate('createdBy', 'username email fullName profilePicture phoneNumber address')
      .sort({ createdAt: -1 });

    res.set('Cache-Control', 'private, no-store, max-age=0');
    res.set('Surrogate-Control', 'no-store');

    res.json({ success: true, count: properties.length, properties });
  } catch (error) {
    console.error('Get properties by user error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.searchProperties = async (req, res) => {
  try {
    const { location, propertyType, minPrice, maxPrice, status, amenities } = req.query;
    let query = {};
    if (location) query['location.address'] = { $regex: location, $options: 'i' };
    if (propertyType && propertyType !== 'all') query.propertyType = propertyType;
    if (minPrice || maxPrice) { query.price = {}; if (minPrice) query.price.$gte = Number(minPrice); if (maxPrice) query.price.$lte = Number(maxPrice); }
    if (status && status !== 'all') query.status = status;
    if (amenities) {
      const amenitiesArray = typeof amenities === 'string' ? amenities.split(',').map(a => a.trim()) : amenities;
      query.amenities = { $in: amenitiesArray };
    }

    // Default: only return verified properties to public consumers
    if (!req.user || req.user.role !== 'admin') {
      query.verification_status = 'verified';
    }
    const properties = await Property.find(query)
      .populate('postedBy', 'username email fullName profilePicture phoneNumber address')
      .populate('createdBy', 'username email fullName profilePicture phoneNumber address')
      .sort({ createdAt: -1 });

    // Remove verification documents/history for non-admin and non-owner viewers
    const cleaned = properties.map(p => {
      const obj = p.toObject ? p.toObject() : p;
      if (!req.user || (String(req.user._id) !== String(obj.postedBy?._id) && req.user.role !== 'admin')) {
        delete obj.verification_documents;
        delete obj.verification_history;
        delete obj.verification_notes;
      }
      return obj;
    });

    res.json({ success: true, count: cleaned.length, properties: cleaned });
  } catch (error) {
    console.error('Search properties error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
