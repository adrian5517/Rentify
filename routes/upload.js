const express = require('express')
const router = express.Router()
const multer = require('multer')
const streamifier = require('streamifier')
const cloudinary = require('../cloudinary')

const storage = multer.memoryStorage()
const upload = multer({ storage })

function uploadBufferToCloudinary(buffer, folder = 'rentify/profiles') {
  return new Promise((resolve, reject) => {
    try {
      const stream = cloudinary.uploader.upload_stream({ folder }, (error, result) => {
        if (error) return reject(error)
        resolve(result)
      })
      streamifier.createReadStream(buffer).pipe(stream)
    } catch (err) {
      reject(err)
    }
  })
}

router.post('/', upload.any(), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No file uploaded' })
    }

    const results = []
    for (const file of req.files) {
      const result = await uploadBufferToCloudinary(file.buffer, 'rentify/profiles')
      results.push({ fileName: file.originalname, url: result.secure_url || result.url })
    }

    return res.status(200).json({ success: true, files: results, fileUrl: results[0].url || results[0].url })
  } catch (err) {
    console.error('Upload route error:', err)
    return res.status(500).json({ success: false, message: 'Internal Server Error during upload', error: String(err.message || err) })
  }
})

module.exports = router
