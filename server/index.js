const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const smsRoutes = require('./api/sms');

const { startBot } = require('./services/discord/bot');

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Import routes
const contactsRouter = require('./api/contacts');
const groupsRouter = require('./api/groups');
const invitationsRouter = require('./api/invitations');
const smsRouter = require('./api/sms');

// Use routes
app.use('/api/contacts', contactsRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/invitations', invitationsRouter);
app.use('/api/sms', smsRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Party Invitation SMS Server API' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Start Discord bot
  startBot();
});