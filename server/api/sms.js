const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { sendSMS } = require('../services/phoneIntegration/firebase');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    // Accept only images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Send SMS with optional image
router.post('/send', upload.single('image'), async (req, res) => {
  try {
    const { numbers, message } = req.body;
    
    if (!numbers || !message) {
      return res.status(400).json({ success: false, error: 'Phone numbers and message are required' });
    }
    
    // Parse phone numbers (expect comma-separated string or array)
    const phoneNumbers = Array.isArray(numbers) ? numbers : numbers.split(',').map(num => num.trim());
    
    // Get image URL if uploaded
    const imageUrl = req.file ? 
      `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}` : 
      null;
    
    // Send SMS via Firebase Cloud Messaging to phone
    const result = await sendSMS(phoneNumbers, message, imageUrl);
    
    if (result.success) {
      res.json({ success: true, messageId: result.messageId });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Error in /sms/send endpoint:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
