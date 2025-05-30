#!/bin/bash

# Party Invitation SMS Server Setup Script
# This script creates the project structure and initializes the Node.js application

# Define colors for better readability
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}  Setting up Party Invitation Server  ${NC}"
echo -e "${BLUE}=========================================${NC}"

# Create project directory
PROJECT_DIR="party-invitation-server"
mkdir -p $PROJECT_DIR
cd $PROJECT_DIR

# Create directory structure
echo -e "\n${GREEN}Creating directory structure...${NC}"
mkdir -p server/api
mkdir -p server/services/phoneIntegration
mkdir -p server/uploads
mkdir -p client/src
mkdir -p database
mkdir -p config

# Initialize Node.js project
echo -e "\n${GREEN}Initializing Node.js project...${NC}"
npm init -y

# Update package.json
echo -e "\n${GREEN}Configuring package.json...${NC}"
cat > package.json << EOL
{
  "name": "party-invitation-server",
  "version": "1.0.0",
  "description": "A server to send party invitations via SMS using your Android phone",
  "main": "server/index.js",
  "scripts": {
    "start": "node server/index.js",
    "dev": "nodemon server/index.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": ["sms", "party", "invitation", "raspberry-pi", "firebase"],
  "author": "",
  "license": "ISC"
}
EOL

# Install dependencies
echo -e "\n${GREEN}Installing dependencies...${NC}"
npm install express body-parser cors firebase-admin multer sqlite3 dotenv

# Install dev dependencies
echo -e "\n${GREEN}Installing development dependencies...${NC}"
npm install --save-dev nodemon

# Create .env file
echo -e "\n${GREEN}Creating configuration files...${NC}"
cat > .env << EOL
# Server Configuration
PORT=3000

# Firebase Configuration
# Replace these with your actual Firebase configuration values
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email

# Phone Configuration
PHONE_FCM_TOKEN=your-phone-fcm-token

# Database Configuration
DATABASE_PATH=./database/invitation.db
EOL

# Create .gitignore
cat > .gitignore << EOL
# Node modules
node_modules/

# Environment variables
.env

# Build files
dist/
build/

# Logs
logs/
*.log
npm-debug.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Uploaded files
server/uploads/*
!server/uploads/.gitkeep

# Database files
*.db
*.sqlite

# Firebase service account
firebase-service-account.json
EOL

# Create empty .gitkeep files to preserve directory structure
touch server/uploads/.gitkeep
touch database/.gitkeep

# Create main server file
echo -e "\n${GREEN}Creating server files...${NC}"
cat > server/index.js << EOL
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

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
app.use('/api/sms', smsRouter);

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Party Invitation SMS Server API' });
});

// Start server
app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});
EOL

# Create Firebase service integration
cat > server/services/phoneIntegration/firebase.js << EOL
const admin = require('firebase-admin');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize Firebase Admin
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\\\n/g, '\\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Function to send SMS via FCM to phone
async function sendSMS(phoneNumbers, message, imageUrl = null) {
  try {
    // Prepare the FCM message payload
    const payload = {
      token: process.env.PHONE_FCM_TOKEN,
      data: {
        type: 'send_sms',
        numbers: JSON.stringify(phoneNumbers),
        message: message
      }
    };
    
    // Add image URL if provided
    if (imageUrl) {
      payload.data.imageUrl = imageUrl;
    }
    
    // Send the message
    const response = await admin.messaging().send(payload);
    console.log('Successfully sent message:', response);
    return { success: true, messageId: response };
  } catch (error) {
    console.error('Error sending message:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendSMS
};
EOL

# Create API routes
cat > server/api/sms.js << EOL
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
      \`\${req.protocol}://\${req.get('host')}/uploads/\${req.file.filename}\` : 
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
EOL

# Create placeholder files for other API routes
cat > server/api/contacts.js << EOL
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
  res.json({ message: \`Get contact \${req.params.id} endpoint\` });
});

// Update contact
router.put('/:id', (req, res) => {
  // TODO: Implement updating a contact
  res.json({ message: \`Update contact \${req.params.id} endpoint\` });
});

// Delete contact
router.delete('/:id', (req, res) => {
  // TODO: Implement deleting a contact
  res.json({ message: \`Delete contact \${req.params.id} endpoint\` });
});

module.exports = router;
EOL

cat > server/api/groups.js << EOL
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
  res.json({ message: \`Get group \${req.params.id} endpoint\` });
});

// Update group
router.put('/:id', (req, res) => {
  // TODO: Implement updating a group
  res.json({ message: \`Update group \${req.params.id} endpoint\` });
});

// Delete group
router.delete('/:id', (req, res) => {
  // TODO: Implement deleting a group
  res.json({ message: \`Delete group \${req.params.id} endpoint\` });
});

// Add contact to group
router.post('/:id/contacts', (req, res) => {
  // TODO: Implement adding a contact to a group
  res.json({ message: \`Add contact to group \${req.params.id} endpoint\` });
});

// Remove contact from group
router.delete('/:id/contacts/:contactId', (req, res) => {
  // TODO: Implement removing a contact from a group
  res.json({ message: \`Remove contact \${req.params.contactId} from group \${req.params.id} endpoint\` });
});

module.exports = router;
EOL

cat > server/api/invitations.js << EOL
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
      \`\${req.protocol}://\${req.get('host')}/uploads/\${req.file.filename}\` : 
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
  res.json({ message: \`Get invitation \${req.params.id} endpoint\` });
});

// Update invitation
router.put('/:id', upload.single('image'), (req, res) => {
  // TODO: Implement updating an invitation
  res.json({ message: \`Update invitation \${req.params.id} endpoint\` });
});

// Delete invitation
router.delete('/:id', (req, res) => {
  // TODO: Implement deleting an invitation
  res.json({ message: \`Delete invitation \${req.params.id} endpoint\` });
});

// Send invitation to a group
router.post('/:id/send/:groupId', (req, res) => {
  // TODO: Implement sending an invitation to a group
  res.json({ message: \`Send invitation \${req.params.id} to group \${req.params.groupId} endpoint\` });
});

module.exports = router;
EOL

# Create README file
cat > README.md << EOL
# Party Invitation SMS Server

A Node.js server that runs on a Raspberry Pi and sends party invitations via SMS using your Android phone.

## Features

- Send SMS party invitations from your personal phone number
- Upload and include images in invitations
- Manage contacts and contact groups
- Works remotely via Firebase Cloud Messaging

## Prerequisites

- Raspberry Pi running Node.js
- Android phone with Tasker and AutoTools installed
- Firebase account (free tier)

## Setup Instructions

### Server Setup

1. Clone this repository onto your Raspberry Pi
2. Install dependencies with \`npm install\`
3. Create a Firebase project and get service account credentials
4. Update the \`.env\` file with your Firebase configuration
5. Start the server with \`npm start\`

### Android Phone Setup

1. Install Tasker and AutoTools from Google Play Store
2. Set up Firebase Cloud Messaging in Tasker (instructions coming soon)
3. Configure Tasker profile to send SMS when FCM message is received

## API Endpoints

- \`POST /api/sms/send\` - Send SMS to specified phone numbers
- \`GET/POST /api/contacts\` - Manage contacts
- \`GET/POST /api/groups\` - Manage contact groups
- \`GET/POST /api/invitations\` - Manage invitation templates

## License

ISC
EOL

echo -e "\n${GREEN}Creating database initialization script...${NC}"
cat > database/init.js << EOL
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const dbPath = path.resolve(__dirname, 'invitation.db');

// Create database directory if it doesn't exist
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Connect to database (will create it if it doesn't exist)
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
    return;
  }
  console.log('Connected to the SQLite database.');
  
  // Run migrations
  db.serialize(() => {
    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON');
    
    // Create Contacts table
    db.run(\`CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone_number TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )\`);
    
    // Create Groups table
    db.run(\`CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )\`);
    
    // Create Group_Contacts junction table
    db.run(\`CREATE TABLE IF NOT EXISTS group_contacts (
      group_id INTEGER,
      contact_id INTEGER,
      PRIMARY KEY (group_id, contact_id),
      FOREIGN KEY (group_id) REFERENCES groups (id) ON DELETE CASCADE,
      FOREIGN KEY (contact_id) REFERENCES contacts (id) ON DELETE CASCADE
    )\`);
    
    // Create Invitations table
    db.run(\`CREATE TABLE IF NOT EXISTS invitations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      image_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )\`);
    
    // Create Sent_Invitations table to track history
    db.run(\`CREATE TABLE IF NOT EXISTS sent_invitations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invitation_id INTEGER,
      group_id INTEGER,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'pending',
      FOREIGN KEY (invitation_id) REFERENCES invitations (id) ON DELETE SET NULL,
      FOREIGN KEY (group_id) REFERENCES groups (id) ON DELETE SET NULL
    )\`);
    
    console.log('Database tables created successfully.');
  });
});

// Close the database connection
db.close((err) => {
  if (err) {
    console.error('Error closing database', err.message);
  } else {
    console.log('Database connection closed.');
  }
});
EOL

# Add database initialization to package.json
npx json -I -f package.json -e "this.scripts.initdb = 'node database/init.js'"

# Add README.md for Tasker setup
mkdir -p docs
cat > docs/tasker_setup.md << EOL
# Tasker Setup for Party Invitation SMS

This guide will help you set up Tasker on your Android phone to send SMS messages when triggered by Firebase Cloud Messaging (FCM).

## Prerequisites

1. Android phone
2. Tasker app installed
3. AutoTools plugin for Tasker
4. Firebase Cloud Messaging API key

## Step 1: Install Required Apps

1. Install [Tasker](https://play.google.com/store/apps/details?id=net.dinglisch.android.taskerm) from the Google Play Store
2. Install [AutoTools](https://play.google.com/store/apps/details?id=com.joaomgcd.autotools) plugin for Tasker

## Step 2: Set Up Firebase Cloud Messaging Receiver

1. Open Tasker
2. Create a new Profile by tapping the + button
3. Select "Event" as the profile type
4. Choose "Plugin" → "AutoTools" → "AutoTools Cloud"
5. Tap the pencil icon to configure
6. Enter your Firebase API Key
7. Set the Message Type Filter to "send_sms"
8. Save the configuration

## Step 3: Create Task to Send SMS

1. After creating the profile, you'll be prompted to create a new task
2. Name the task "Send SMS Invitation"
3. Add the following actions:

### Action 1: Parse JSON Data
1. Add an action: "Code" → "JavaScript"
2. Enter the following code:
\`\`\`javascript
// Parse the incoming FCM data
var data = JSON.parse(global('autoToolsCloudJsonData'));
var phoneNumbers = JSON.parse(data.numbers);
var message = data.message;
var imageUrl = data.imageUrl; // May be null

// Store in Tasker variables
setGlobal('SMS_NUMBERS', phoneNumbers.join(','));
setGlobal('SMS_MESSAGE', message);
if (imageUrl) {
  setGlobal('SMS_IMAGE_URL', imageUrl);
}
\`\`\`

### Action 2: Download Image (if included)
1. Add an action: "If" condition
2. Set condition to: \`%SMS_IMAGE_URL Set\`
3. Add an action inside the If block: "Net" → "HTTP Request"
4. Set Method to GET
5. Set URL to: \`%SMS_IMAGE_URL\`
6. Set Output File to: \`/storage/emulated/0/Download/invitation_image.jpg\`
7. Add "End If" action

### Action 3: Send SMS to Each Recipient
1. Add an action: "Code" → "JavaScript"
2. Enter the following code:
\`\`\`javascript
// Get the recipients list
var numbersString = global('SMS_NUMBERS');
var numbers = numbersString.split(',');
var message = global('SMS_MESSAGE');

// Set a global with the total count (for progress tracking)
setGlobal('SMS_TOTAL_COUNT', numbers.length);
setGlobal('SMS_CURRENT_COUNT', 0);

// Store the array for the For loop
setGlobal('SMS_NUMBERS_ARRAY', JSON.stringify(numbers));
\`\`\`

3. Add an action: "Loop" → "For Variable"
4. Set "Variable" to: \`%SMS_CURRENT_NUMBER\`
5. Set "Items" to: \`%SMS_NUMBERS_ARRAY\`
6. Inside the loop, add:
   - Action: "Phone" → "Send SMS"
   - Number: \`%SMS_CURRENT_NUMBER\`
   - Message: \`%SMS_MESSAGE\`
   - If downloading the image worked, add:
     - Action: "Phone" → "Send MMS"
     - Number: \`%SMS_CURRENT_NUMBER\`
     - File: \`/storage/emulated/0/Download/invitation_image.jpg\`
7. Add "End For" action

## Step 4: Test the Setup

1. Use the API endpoint from your server to trigger a test message
2. Verify that your phone receives the FCM message and sends SMS

## Troubleshooting

- Ensure battery optimization is disabled for Tasker
- Check that your phone has permission to send SMS messages
- Verify your FCM API key is correctly entered in AutoTools

For more help, visit the [Tasker subreddit](https://www.reddit.com/r/tasker/) or the [Tasker Google Group](https://groups.google.com/g/tasker).
EOL

echo -e "\n${GREEN}Adding database initialization script to package.json...${NC}"
npm pkg set scripts.initdb="node database/init.js"

echo -e "\n${BLUE}=========================================${NC}"
echo -e "${GREEN}Setup complete! Next steps:${NC}"
echo -e "${BLUE}=========================================${NC}"
echo -e "1. Navigate to the project directory: ${GREEN}cd $PROJECT_DIR${NC}"
echo -e "2. Set up your Firebase account and update .env file"
echo -e "3. Initialize the database: ${GREEN}npm run initdb${NC}"
echo -e "4. Start the server: ${GREEN}npm run dev${NC}"
echo -e "5. Set up Tasker on your Android phone (see docs/tasker_setup.md)"
echo -e "\n${BLUE}Happy coding!${NC}"