const express = require('express');
const router = express.Router();

// Get all contacts
router.get('/', (req, res) => {
  // TODO: Implement fetching contacts from database
  res.json({ message: 'Get all contacts endpoint' });
});

// Add a new contact
router.post('/', (req, res) => {
  // TODO: Implement adding a contact to database
  res.json({ message: 'Add contact endpoint' });
});

// Get contact by id
router.get('/:id', (req, res) => {
  // TODO: Implement fetching a specific contact
  res.json({ message: `Get contact ${req.params.id} endpoint` });
});

// Update contact
router.put('/:id', (req, res) => {
  // TODO: Implement updating a contact
  res.json({ message: `Update contact ${req.params.id} endpoint` });
});

// Delete contact
router.delete('/:id', (req, res) => {
  // TODO: Implement deleting a contact
  res.json({ message: `Delete contact ${req.params.id} endpoint` });
});

module.exports = router;
