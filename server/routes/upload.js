const express = require('express');
const router = express.Router();
const { upload, uploadFile } = require('../services/uploadService');
const { protect } = require('../middleware/auth');

// @desc    Upload an image (profile pic, club logo, etc.)
// @route   POST /api/upload
// @access  Private
router.post('/', protect, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select a file to upload' });
    }

    const fileUrl = await uploadFile(req.file);

    res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      url: fileUrl,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
