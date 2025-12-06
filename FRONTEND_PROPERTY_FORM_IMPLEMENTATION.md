# Property Create/Edit Form — Frontend Implementation Guide

## Goal
Build a secure, user-friendly frontend form to create and edit properties that integrates with the existing backend controller at `controllers/propertyController.js`.

## Background (for implementer)
- Backend handlers: `createProperty`, `updateProperty`, `getPropertyById`, `getAllProperties`, `deleteProperty` in `controllers/propertyController.js`.
- Authentication: Backend expects an authenticated user (JWT Bearer token). The frontend must include the token in `Authorization: Bearer <token>` for create/update/delete.
- Image handling: Backend accepts image upload(s) via `req.files` and uploads to Cloudinary. The frontend should send multipart/form-data with files under the same key (e.g. `images`).

---

## Requirements
- Provide two main flows:
  - Create property: `POST /api/properties` (multipart/form-data)
  - Edit property: `PUT /api/properties/:id` (or `PATCH` if preferred by your app)

- Form fields (UI):
  - `name` (string, required)
  - `description` (string)
  - `price` (number, required)
  - `address` (string)
  - `latitude`, `longitude` (numbers, optional)
  - `propertyType` (string, default `other`)
  - `amenities` (array or comma-separated string)
  - `status` (string, default `available`)
  - `phoneNumber` (string)
  - `images` (multiple file input)

- Client-side validation rules:
  - `name`: required, non-empty
  - `price`: numeric and > 0
  - `address`: recommended non-empty for better listings
  - `latitude`/`longitude`: valid floats if provided
  - `amenities`: parsed to array (split CSV and trim)
  - `images`: optional, limit the number of files (e.g. max 10), accept `image/*`

- Security constraints:
  - Always attach `Authorization: Bearer <jwt>` header from authenticated session.
  - Do NOT send or allow editing of protected fields: `postedBy`, `createdBy`, `_id`.

- UX requirements:
  - Preview selected images before upload and allow removing previews.
  - Show inline validation hints for required fields.
  - Show upload progress and success/error toasts.
  - Disable submit while uploading or when the form is invalid.

---

## API Contract Examples

### Create property (multipart/form-data)
- FormData keys:
  - `name`, `description`, `price`, `address`, `latitude`, `longitude`, `propertyType`, `amenities` (comma-separated string), `status`, `phoneNumber`
  - `images` — append multiple `File` objects under the same key
- Headers:
  - `Authorization: Bearer <jwt>`
  - Do NOT set `Content-Type` manually; let the browser set multipart boundary

#### Sample fetch (plain JS)
```javascript
async function createProperty(formValues, imageFiles, jwt) {
  const fd = new FormData();
  fd.append('name', formValues.name);
  fd.append('description', formValues.description || '');
  fd.append('price', String(formValues.price));
  fd.append('address', formValues.address || '');
  if (formValues.latitude) fd.append('latitude', String(formValues.latitude));
  if (formValues.longitude) fd.append('longitude', String(formValues.longitude));
  fd.append('propertyType', formValues.propertyType || 'other');
  fd.append('amenities', (formValues.amenities || []).join(','));
  fd.append('status', formValues.status || 'available');
  fd.append('phoneNumber', formValues.phoneNumber || '');

  for (const file of imageFiles) {
    fd.append('images', file);
  }

  const res = await fetch('/api/properties', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`
    },
    body: fd
  });

  if (!res.ok) {
    const body = await res.json().catch(()=>({ message: 'Unknown error' }));
    throw new Error(body.message || 'Upload failed');
  }
  return res.json();
}
```

### Update property (send only allowed fields)
```javascript
async function updateProperty(propertyId, updatedValues, imageFiles, jwt) {
  const fd = new FormData();
  if (updatedValues.name) fd.append('name', updatedValues.name);
  if (updatedValues.description) fd.append('description', updatedValues.description);
  if (updatedValues.price) fd.append('price', String(updatedValues.price));
  if (updatedValues.address) fd.append('address', updatedValues.address);
  if (updatedValues.latitude) fd.append('latitude', String(updatedValues.latitude));
  if (updatedValues.longitude) fd.append('longitude', String(updatedValues.longitude));
  if (updatedValues.propertyType) fd.append('propertyType', updatedValues.propertyType);
  if (updatedValues.amenities) fd.append('amenities', (updatedValues.amenities || []).join(','));
  if (updatedValues.status) fd.append('status', updatedValues.status);
  if (updatedValues.phoneNumber) fd.append('phoneNumber', updatedValues.phoneNumber);

  for (const file of imageFiles) fd.append('images', file);

  const res = await fetch(`/api/properties/${propertyId}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${jwt}` },
    body: fd
  });
  if (!res.ok) {
    const body = await res.json().catch(()=>({ message: 'Unknown error' }));
    throw new Error(body.message || 'Update failed');
  }
  return res.json();
}
```

---

## Client-side helper snippets

**Price validation**
```javascript
function isValidPrice(v) {
  const n = Number(v);
  return !isNaN(n) && n > 0;
}
```

**Amenities parsing**
```javascript
function parseAmenities(input) {
  if (!input) return [];
  return Array.isArray(input) ? input : input.split(',').map(a => a.trim()).filter(Boolean);
}
```

**Image preview (plain JS)**
```javascript
function createPreviews(files) {
  return Array.from(files).map(file => ({
    file,
    url: URL.createObjectURL(file)
  }));
}
```

---

## React form skeleton (high-level)
- State:
  - `form` — object with fields
  - `images` — File[] to upload
  - `previews` — { file, url }[] for UI preview
  - `errors` — validation errors
  - `isSubmitting` — boolean

- Lifecycle:
  - On mount for edit: fetch property via `GET /api/properties/:id` and populate `form` and existing image URLs
  - On file select: update `images` and `previews` using `createPreviews`
  - On submit: run client validation; if valid call `createProperty` or `updateProperty`

- Example file path suggestion: `src/components/property/PropertyForm.jsx`

---

## Edge cases & notes for implementer
- `updateProperty` in current backend does not handle image uploads — coordinate with backend to accept `req.files` on update or add a dedicated endpoint to manage images (add/remove).
- Backend converts `price` to `Number` on create. Send numeric strings or numbers.
- Client should never send `postedBy` — backend uses `req.user` when authenticated.
- If a 403 (forbidden) is returned on update/delete, show a clear message: "You are not authorized to update this property.".

---

## Acceptance criteria (testable)
- Creating a property with valid inputs returns HTTP 201 and a `property` object with `images` (URLs) and `postedBy`.
- Editing a property owned by the current user returns HTTP 200 and updated fields are present.
- Invalid client-side inputs block submission and show helpful inline errors.
- Image previews show before upload and upload progress is visible.

---

## Testing checklist (manual)
- [ ] Authenticated user can create property with 1..N images.
- [ ] Attempt to create with missing required fields shows client validation error.
- [ ] Authenticated user can edit only their own properties.
- [ ] Non-owner receives 403 when attempting to update/delete.
- [ ] Images are shown in listing after creation.

---

## Deliverables for a PR
- `src/components/property/PropertyForm.jsx` (or `.tsx`) — full Create/Edit form component
- Unit tests for client validation (Jest/React Testing Library)
- README or code comments describing the endpoints used and required headers

---

## Next steps I can do for you
- Produce a complete React component (form, previews, validation, submission)
- Add a small Jest test for validation
- Extend backend `updateProperty` to accept image uploads and manage existing images

If you want one of those, tell me which and I'll implement it next.
