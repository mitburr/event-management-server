const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Set path to the database file
const dbPath = path.resolve(__dirname, '../../database/invitation.db');

// Create database directory if it doesn't exist
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log(`Created database directory at: ${dbDir}`);
}

// Open database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Could not connect to database', err);
  } else {
    console.log(`Connected to database at: ${dbPath}`);
  }
});

// Initialize database schema
function initDatabase() {
  return new Promise((resolve, reject) => {
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
      )`, (err) => {
        if (err) reject(err);
      });
      
      // Create Groups table
      db.run(`CREATE TABLE IF NOT EXISTS groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) reject(err);
      });
      
      // Create Group_Contacts junction table
      db.run(`CREATE TABLE IF NOT EXISTS group_contacts (
        group_id INTEGER,
        contact_id INTEGER,
        PRIMARY KEY (group_id, contact_id),
        FOREIGN KEY (group_id) REFERENCES groups (id) ON DELETE CASCADE,
        FOREIGN KEY (contact_id) REFERENCES contacts (id) ON DELETE CASCADE
      )`, (err) => {
        if (err) reject(err);
      });
      
      // Create Invitations table
      db.run(`CREATE TABLE IF NOT EXISTS invitations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        image_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) reject(err);
      });
      
      // Create Sent_Invitations table
      db.run(`CREATE TABLE IF NOT EXISTS sent_invitations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invitation_id INTEGER,
        group_id INTEGER,
        sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'pending',
        FOREIGN KEY (invitation_id) REFERENCES invitations (id) ON DELETE SET NULL,
        FOREIGN KEY (group_id) REFERENCES groups (id) ON DELETE SET NULL
      )`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
}

// Initialize the database when this module is imported
initDatabase()
  .then(() => console.log('Database schema initialized'))
  .catch(err => console.error('Error initializing database schema:', err));

// Export the database connection and init function
module.exports = {
  db,
  initDatabase
};