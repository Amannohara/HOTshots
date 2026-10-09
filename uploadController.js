// server/controllers/uploadController.js
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── POST /api/upload ──────────────────────────────────────────────────────
// Accepts { data: base64String, folder?: string }
const uploadImage = async (req, res) => {
  try {
    const { data, folder = 'hotshotz' } = req.body;

    if (!data) {
      return res.status(400).json({ success: false, message: 'No image data provided.' });
    }

    // data should be a base64 data URI: "data:image/jpeg;base64,..."
    const result = await cloudinary.uploader.upload(data, {
      folder,
      resource_type: 'image',
      transformation: [
        { width: 1200, height: 900, crop: 'limit', quality: 'auto', fetch_format: 'auto' }
      ],
    });

    res.json({
      success:  true,
      url:      result.secure_url,
      publicId: result.public_id,
    });
  } catch (error) {
    console.error('uploadImage error:', error);
    res.status(500).json({ success: false, message: 'Image upload failed. Please try again.' });
  }
};

module.exports = { uploadImage };
