const { db, initDatabase } = require('../server/database/connection');

// Sample data
const contacts = [
  { name: 'John Smith', phone_number: '+15551234567' },
  { name: 'Jane Doe', phone_number: '+15559876543' },
  { name: 'Bob Johnson', phone_number: '+15555555555' }
];

const groups = [
  { name: 'Friends', description: 'Close friends' },
  { name: 'Family', description: 'Family members' },
  { name: 'Work', description: 'Work colleagues' }
];

// Add sample contacts
function addContacts() {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare('INSERT OR IGNORE INTO contacts (name, phone_number) VALUES (?, ?)');
    contacts.forEach(contact => {
      stmt.run(contact.name, contact.phone_number);
    });
    stmt.finalize(err => {
      if (err) reject(err);
      else {
        console.log('Added sample contacts');
        resolve();
      }
    });
  });
}

// Add sample groups
function addGroups() {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare('INSERT OR IGNORE INTO groups (name, description) VALUES (?, ?)');
    groups.forEach(group => {
      stmt.run(group.name, group.description);
    });
    stmt.finalize(err => {
      if (err) reject(err);
      else {
        console.log('Added sample groups');
        resolve();
      }
    });
  });
}

// Link contacts to groups
function linkContactsToGroups() {
  return new Promise((resolve, reject) => {
    // Get contact IDs
    db.all('SELECT id, name FROM contacts', [], (err, contactRows) => {
      if (err) {
        console.error('Error fetching contacts:', err);
        reject(err);
        return;
      }
      
      // Get group IDs
      db.all('SELECT id, name FROM groups', [], (err, groupRows) => {
        if (err) {
          console.error('Error fetching groups:', err);
          reject(err);
          return;
        }
        
        const friendsGroup = groupRows.find(g => g.name === 'Friends');
        const familyGroup = groupRows.find(g => g.name === 'Family');
        const workGroup = groupRows.find(g => g.name === 'Work');
        
        const john = contactRows.find(c => c.name === 'John Smith');
        const jane = contactRows.find(c => c.name === 'Jane Doe');
        const bob = contactRows.find(c => c.name === 'Bob Johnson');
        
        let pending = 0;
        let completed = 0;
        
        function checkDone() {
          completed++;
          if (completed === pending) {
            console.log('Linked contacts to groups');
            resolve();
          }
        }
        
        // Add John to Friends and Work
        if (john && friendsGroup) {
          pending++;
          db.run('INSERT OR IGNORE INTO group_contacts (group_id, contact_id) VALUES (?, ?)', 
            [friendsGroup.id, john.id], checkDone);
        }
        if (john && workGroup) {
          pending++;
          db.run('INSERT OR IGNORE INTO group_contacts (group_id, contact_id) VALUES (?, ?)', 
            [workGroup.id, john.id], checkDone);
        }
        
        // Add Jane to Family
        if (jane && familyGroup) {
          pending++;
          db.run('INSERT OR IGNORE INTO group_contacts (group_id, contact_id) VALUES (?, ?)', 
            [familyGroup.id, jane.id], checkDone);
        }
        
        // Add Bob to Friends, Family and Work
        if (bob && friendsGroup) {
          pending++;
          db.run('INSERT OR IGNORE INTO group_contacts (group_id, contact_id) VALUES (?, ?)', 
            [friendsGroup.id, bob.id], checkDone);
        }
        if (bob && familyGroup) {
          pending++;
          db.run('INSERT OR IGNORE INTO group_contacts (group_id, contact_id) VALUES (?, ?)', 
            [familyGroup.id, bob.id], checkDone);
        }
        if (bob && workGroup) {
          pending++;
          db.run('INSERT OR IGNORE INTO group_contacts (group_id, contact_id) VALUES (?, ?)', 
            [workGroup.id, bob.id], checkDone);
        }
        
        // If no links to create
        if (pending === 0) {
          console.log('No contacts linked to groups');
          resolve();
        }
      });
    });
  });
}

// Run all seed functions in sequence
async function seed() {
  console.log('Starting database seeding...');
  
  try {
    // Make sure database is initialized
    await initDatabase();
    console.log('Database initialized, tables verified');
    
    // Add data
    await addContacts();
    await addGroups();
    await linkContactsToGroups();
    
    console.log('Database seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seed function
seed();