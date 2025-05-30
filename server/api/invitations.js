const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

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

// Get all invitations
router.get('/', (req, res) => {
  // TODO: Implement fetching invitations from database
  res.json({ message: 'Get all invitations endpoint' });
});

// Create a new invitation
router.post('/', upload.single('image'), (req, res) => {
  try {
    const { title, message } = req.body;
    
    if (!title || !message) {
      return res.status(400).json({ success: false, error: 'Title and message are required' });
    }
    
    // Get image URL if uploaded
    const imageUrl = req.file ? 
      `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}` : 
      null;
    
    // TODO: Save invitation to database
    
    res.json({ 
      success: true, 
      invitation: {
        title,
        message,
        imageUrl
      }
    });
  } catch (error) {
    console.error('Error in create invitation endpoint:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get invitation by id
router.get('/:id', (req, res) => {
  // TODO: Implement fetching a specific invitation
  res.json({ message: `Get invitation ${req.params.id} endpoint` });
});

// Update invitation
router.put('/:id', upload.single('image'), (req, res) => {
  // TODO: Implement updating an invitation
  res.json({ message: `Update invitation ${req.params.id} endpoint` });
});

// Delete invitation
router.delete('/:id', (req, res) => {
  // TODO: Implement deleting an invitation
  res.json({ message: `Delete invitation ${req.params.id} endpoint` });
});

// Send invitation to a group
router.post('/:id/send/:groupId', (req, res) => {
  // TODO: Implement sending an invitation to a group
  res.json({ message: `Send invitation ${req.params.id} to group ${req.params.groupId} endpoint` });
});

module.exports = router;
