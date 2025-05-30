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
    db.run(`CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone_number TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Create Groups table
    db.run(`CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Create Group_Contacts junction table
    db.run(`CREATE TABLE IF NOT EXISTS group_contacts (
      group_id INTEGER,
      contact_id INTEGER,
      PRIMARY KEY (group_id, contact_id),
      FOREIGN KEY (group_id) REFERENCES groups (id) ON DELETE CASCADE,
      FOREIGN KEY (contact_id) REFERENCES contacts (id) ON DELETE CASCADE
    )`);
    
    // Create Invitations table
    db.run(`CREATE TABLE IF NOT EXISTS invitations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      image_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Create Sent_Invitations table to track history
    db.run(`CREATE TABLE IF NOT EXISTS sent_invitations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invitation_id INTEGER,
      group_id INTEGER,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'pending',
      FOREIGN KEY (invitation_id) REFERENCES invitations (id) ON DELETE SET NULL,
      FOREIGN KEY (group_id) REFERENCES groups (id) ON DELETE SET NULL
    )`);
    
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
