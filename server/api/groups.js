const express = require('express');
const router = express.Router();

// Get all groups
router.get('/', (req, res) => {
  // TODO: Implement fetching groups from database
  res.json({ message: 'Get all groups endpoint' });
});

// Add a new group
router.post('/', (req, res) => {
  // TODO: Implement adding a group to database
  res.json({ message: 'Add group endpoint' });
});

// Get group by id
router.get('/:id', (req, res) => {
  // TODO: Implement fetching a specific group
  res.json({ message: `Get group ${req.params.id} endpoint` });
});

// Update group
router.put('/:id', (req, res) => {
  // TODO: Implement updating a group
  res.json({ message: `Update group ${req.params.id} endpoint` });
});

// Delete group
router.delete('/:id', (req, res) => {
  // TODO: Implement deleting a group
  res.json({ message: `Delete group ${req.params.id} endpoint` });
});

// Add contact to group
router.post('/:id/contacts', (req, res) => {
  // TODO: Implement adding a contact to a group
  res.json({ message: `Add contact to group ${req.params.id} endpoint` });
});

// Remove contact from group
router.delete('/:id/contacts/:contactId', (req, res) => {
  // TODO: Implement removing a contact from a group
  res.json({ message: `Remove contact ${req.params.contactId} from group ${req.params.id} endpoint` });
});

module.exports = router;
