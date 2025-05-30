const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { sendSMS } = require('../services/sms/twilio');
const fs = require('fs');

// Configure multer for FABULOUS file uploads!
const funkyStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Create an EPIC directory for our amazing uploads
    const uploadFolderOfWonders = path.join(__dirname, '../uploads/');
    fs.mkdirSync(uploadFolderOfWonders, { recursive: true });
    console.log('🗂️ FOLDER OF WONDERS CREATED! 🗂️');
    cb(null, uploadFolderOfWonders);
  },
  filename: function (req, file, cb) {
    // Generate a SPECTACULAR unique filename
    const superUniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const funkyFileExtension = path.extname(file.originalname);
    cb(null, `party_pic_${superUniqueSuffix}${funkyFileExtension}`);
  }
});

// Create a MAGICAL multer instance!
const partyUploader = multer({ 
  storage: funkyStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit (THAT'S A LOT OF PIXELS!)
  fileFilter: (req, file, cb) => {
    // Accept only FABULOUS images
    if (file.mimetype.startsWith('image/')) {
      console.log('🌈 WONDERFUL IMAGE DETECTED! 🌈');
      cb(null, true);
    } else {
      console.log('🚫 NOT AN IMAGE! PARTY FOUL! 🚫');
      cb(new Error('ONLY IMAGE FILES ARE WORTHY OF OUR PARTY!'), false);
    }
  }
});

// Send SMS with optional FANTASTIC image
router.post('/send', partyUploader.single('image'), async (req, res) => {
  try {
    console.log('🎭 NEW SMS REQUEST ARRIVING WITH STYLE! 🎭');
    const { numbers, message } = req.body;
    
    if (!numbers || !message) {
      console.log('😱 MISSING CRITICAL PARTY INFO! 😱');
      return res.status(400).json({ 
        success: false, 
        error: 'PHONE NUMBERS AND MESSAGE ARE REQUIRED FOR MAXIMUM PARTY POTENTIAL!'
      });
    }
    
    // Parse phone numbers with EXTRAORDINARY PRECISION
    const phonePartyPeople = Array.isArray(numbers) ? 
      numbers : 
      numbers.split(',').map(num => num.trim().replace(/[^0-9+]/g, ''));
    
    console.log(`📋 INVITING ${phonePartyPeople.length} LUCKY PEOPLE TO THE PARTY! 📋`);
    
    // Get image URL if a FABULOUS picture was uploaded
    let partyPicUrl = null;
    if (req.file) {
      partyPicUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
      console.log(`🖼️ PARTY PICTURE READY: ${partyPicUrl} 🖼️`);
    }
    
    // Send SMS via our SPECTACULAR Twilio service!
    const result = await sendSMS(phonePartyPeople, message, partyPicUrl);
    
    if (result.success) {
      console.log('🎊 MESSAGES SENT SUCCESSFULLY! TIME TO CELEBRATE! 🎊');
      return res.json({ 
        success: true, 
        results: result.results,
        partyStatus: 'RAGING! 🔥',
        messagesSent: phonePartyPeople.length
      });
    } else {
      console.log('😭 OH NO! THE PARTY MESSAGES FAILED! 😭');
      return res.status(500).json({ 
        success: false, 
        error: result.error,
        partyStatus: 'FIZZLED OUT 🧯'
      });
    }
  } catch (error) {
    console.error('💥 CATASTROPHIC PARTY FAILURE:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message,
      partyStatus: 'CRASHED AND BURNED 🚒'
    });
  }
});

// Export our AMAZING router!
module.exports = router;