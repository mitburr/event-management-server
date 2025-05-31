const { Client, GatewayIntentBits, Events, ThreadAutoArchiveDuration } = require('discord.js');
const dotenv = require('dotenv');
const { sendSMS } = require('../sms/twilio');
const { db } = require('../../database/connection');

dotenv.config();

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ]
});

// Command prefix
const PREFIX = '!';

// Active conversation threads - map phone numbers to Discord thread IDs
const activeThreads = new Map();

// Process commands
async function processCommand(message) {
  // Ignore messages from bots or messages that don't start with prefix
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;
  
  // Split into command and arguments
  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();
  
  // Command handlers
  switch(command) {
    case 'invite':
      await handleInviteCommand(message, args);
      break;
      
    case 'contacts':
      await handleContactsCommand(message, args);
      break;
      
    case 'groups':
      await handleGroupsCommand(message, args);
      break;
      
    case 'help':
      await handleHelpCommand(message);
      break;

    case 'addcontact':
      await handleAddContactCommand(message, args);
      break;
      
    case 'creategroup':
      await handleCreateGroupCommand(message, args);
      break;
      
    case 'addtogroup':
      await handleAddToGroupCommand(message, args);
      break;
      
    case 'removefromgroup':
      await handleRemoveFromGroupCommand(message, args);
      break;
      
    case 'text':
      await handleTextCommand(message, args);
      break;
      
    default:
      message.reply('Unknown command. Type `!help` to see available commands.');
  }
}

// Handle invite command: !invite <group> <message>
async function handleInviteCommand(message, args) {
  if (args.length < 2) {
    return message.reply('USAGE: !invite <group_name> <your_awesome_message>');
  }
  
  const groupName = args.shift();
  const smsMessage = args.join(' ');
  let partyPicUrl = null;
  
  try {
    // Check for AWESOME ATTACHMENTS!
    if (message.attachments.size > 0) {
      const attachment = message.attachments.first();
      // Check if it's an image
      if (attachment.contentType?.startsWith('image/')) {
        partyPicUrl = attachment.url;
        message.channel.send('🖼️ FABULOUS PICTURE DETECTED! ADDING TO INVITATION! 🖼️');
      }
    }
    
    // Get phone numbers for this AMAZING group
    const partyPeople = await getGroupPhoneNumbers(groupName);
    
    if (!partyPeople || partyPeople.length === 0) {
      return message.reply(`No contacts found in group "${groupName}"`);
    }
    
    // Create a thread for this invitation
    const thread = await message.channel.threads.create({
      name: `Invitation to ${groupName} - ${new Date().toLocaleDateString()}`,
      autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
      reason: `SMS invitation to ${groupName} group`
    });
    
    await thread.send(`📱 **Sending invitation to ${partyPeople.length} contacts in "${groupName}"...**`);
    
    // Send the invitation
    const result = await sendSMS(partyPeople, smsMessage, partyPicUrl);
    
    if (result.success) {
      await thread.send(`✅ Successfully sent invitation to ${partyPeople.length} contacts!`);
      
      // Register this thread for each phone number for replies
      partyPeople.forEach(phone => {
        activeThreads.set(phone, thread.id);
      });
      
      // Store thread info in database for persistence
      await storeThreadInfo(thread.id, partyPeople, groupName);
      
      await thread.send(`📣 This thread will show any replies from the group members. It will automatically archive after one week of inactivity.`);
    } else {
      await thread.send(`❌ Error sending invitations: ${result.error}`);
    }
  } catch (error) {
    console.error('Error processing invite command:', error);
    message.reply('An error occurred while processing your command');
  }
}

async function handleAddContactCommand(message, args) {
  if (args.length < 2) {
    return message.reply('USAGE: !addcontact <name> <phone_number>');
  }
  
  const phoneNumber = args.pop();
  const name = args.join(' ');
  
  // Validate phone number format
  const phoneRegex = /^\+\d{10,15}$/;
  if (!phoneRegex.test(phoneNumber)) {
    return message.reply('Invalid phone number format. Please use international format: +1XXXXXXXXXX');
  }
  
  try {
    const result = await addContact(name, phoneNumber);
    if (result.success) {
      message.reply(`✅ Contact added: ${name} (${phoneNumber})`);
    } else {
      message.reply(`❌ Error adding contact: ${result.error}`);
    }
  } catch (error) {
    console.error('Error adding contact:', error);
    message.reply('An error occurred while adding the contact');
  }
}

async function handleCreateGroupCommand(message, args) {
  if (args.length < 1) {
    return message.reply('USAGE: !creategroup <group_name> [description]');
  }
  
  const groupName = args.shift();
  const description = args.length > 0 ? args.join(' ') : '';
  
  try {
    const result = await createGroup(groupName, description);
    if (result.success) {
      message.reply(`✅ Group "${groupName}" created successfully!`);
    } else {
      message.reply(`❌ Error creating group: ${result.error}`);
    }
  } catch (error) {
    console.error('Error creating group:', error);
    message.reply('An error occurred while creating the group');
  }
}

async function handleAddToGroupCommand(message, args) {
  if (args.length < 2) {
    return message.reply('USAGE: !addtogroup <group_name> <contact_name>');
  }
  
  const groupName = args.shift();
  const contactName = args.join(' ');
  
  try {
    const result = await addContactToGroup(contactName, groupName);
    if (result.success) {
      message.reply(`✅ Added ${contactName} to group "${groupName}"`);
    } else {
      message.reply(`❌ Error: ${result.error}`);
    }
  } catch (error) {
    console.error('Error adding contact to group:', error);
    message.reply('An error occurred while updating the group');
  }
}

async function handleRemoveFromGroupCommand(message, args) {
  if (args.length < 2) {
    return message.reply('USAGE: !removefromgroup <group_name> <contact_name>');
  }
  
  const groupName = args.shift();
  const contactName = args.join(' ');
  
  try {
    const result = await removeContactFromGroup(contactName, groupName);
    if (result.success) {
      message.reply(`✅ Removed ${contactName} from group "${groupName}"`);
    } else {
      message.reply(`❌ Error: ${result.error}`);
    }
  } catch (error) {
    console.error('Error removing contact from group:', error);
    message.reply('An error occurred while updating the group');
  }
}

async function handleTextCommand(message, args) {
  if (args.length < 2) {
    return message.reply('USAGE: !text <contact_name or phone_number> <message>');
  }
  
  const recipient = args.shift();
  const smsMessage = args.join(' ');
  let phoneNumber;
  
  try {
    // Check if it's a phone number or a contact name
    const phoneRegex = /^\+\d{10,15}$/;
    if (phoneRegex.test(recipient)) {
      phoneNumber = recipient;
    } else {
      // Look up the phone number by contact name
      phoneNumber = await getPhoneNumberByName(recipient);
      if (!phoneNumber) {
        return message.reply(`Contact "${recipient}" not found.`);
      }
    }
    
    // Create a thread for this conversation
    const thread = await message.channel.threads.create({
      name: `SMS Chat with ${recipient}`,
      autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
      reason: `SMS conversation with ${recipient}`
    });
    
    await thread.send(`📱 **Sending SMS to ${recipient}...**`);
    
    // Send the SMS
    const result = await sendSMS([phoneNumber], smsMessage);
    
    if (result.success) {
      await thread.send(`✅ Message sent successfully! Any replies will appear in this thread.`);
      
      // Register this thread for replies
      activeThreads.set(phoneNumber, thread.id);
      
      // Store thread info in database for persistence
      await storeThreadInfo(thread.id, [phoneNumber], recipient);
    } else {
      await thread.send(`❌ Error sending message: ${result.error}`);
    }
  } catch (error) {
    console.error('Error sending text:', error);
    message.reply('An error occurred while sending the message');
  }
}

async function handleContactsCommand(message, args) {
  if (!args.length || args[0] === 'list') {
    // List all contacts
    try {
      const contacts = await getAllContacts();
      
      if (contacts.length === 0) {
        return message.reply('No contacts found');
      }
      
      // Format contacts nicely
      const contactsList = contacts.map(c => `${c.id}: ${c.name} (${c.phone_number})`).join('\n');
      
      if (contactsList.length > 1900) {
        // Discord has a 2000 character limit, split into multiple messages if needed
        const chunks = [];
        for (let i = 0; i < contacts.length; i += 20) {
          chunks.push(contacts.slice(i, i + 20).map(c => `${c.id}: ${c.name} (${c.phone_number})`).join('\n'));
        }
        
        message.reply(`**Contacts List (Page 1/${chunks.length}):**\n${chunks[0]}`);
        
        // Send remaining chunks
        for (let i = 1; i < chunks.length; i++) {
          message.channel.send(`**Contacts List (Page ${i+1}/${chunks.length}):**\n${chunks[i]}`);
        }
      } else {
        message.reply(`**Contacts List:**\n${contactsList}`);
      }
    } catch (error) {
      console.error('Error listing contacts:', error);
      message.reply('An error occurred while retrieving contacts');
    }
  } else if (args[0] === 'find' && args.length > 1) {
    // Search for contacts
    const searchTerm = args.slice(1).join(' ');
    try {
      const contacts = await searchContacts(searchTerm);
      
      if (contacts.length === 0) {
        return message.reply(`No contacts found matching "${searchTerm}"`);
      }
      
      const contactsList = contacts.map(c => `${c.id}: ${c.name} (${c.phone_number})`).join('\n');
      message.reply(`**Contacts matching "${searchTerm}":**\n${contactsList}`);
    } catch (error) {
      console.error('Error searching contacts:', error);
      message.reply('An error occurred while searching contacts');
    }
  } else if (args[0] === 'remove' && args.length > 1) {
    // Delete a contact
    const contactId = parseInt(args[1]);
    if (isNaN(contactId)) {
      return message.reply('Invalid contact ID. Please provide a numeric ID.');
    }
    
    try {
      const result = await deleteContact(contactId);
      if (result.success) {
        message.reply(`✅ Contact #${contactId} deleted successfully.`);
      } else {
        message.reply(`❌ Error deleting contact: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting contact:', error);
      message.reply('An error occurred while deleting the contact');
    }
  }
}

async function handleGroupsCommand(message, args) {
  if (!args.length || args[0] === 'list') {
    // List all groups
    try {
      const groups = await getAllGroups();
      
      if (groups.length === 0) {
        return message.reply('No groups found');
      }
      
      // Format groups nicely
      const groupsList = groups.map(g => `${g.id}: ${g.name} - ${g.description || 'No description'}`).join('\n');
      message.reply(`**Groups List:**\n${groupsList}`);
    } catch (error) {
      console.error('Error listing groups:', error);
      message.reply('An error occurred while retrieving groups');
    }
  } else if (args[0] === 'show' && args.length > 1) {
    // Show members of a group
    const groupName = args.slice(1).join(' ');
    try {
      const members = await getGroupMembers(groupName);
      
      if (members.length === 0) {
        return message.reply(`No members found in group "${groupName}" or group doesn't exist`);
      }
      
      const membersList = members.map(m => `- ${m.name} (${m.phone_number})`).join('\n');
      message.reply(`**Members of group "${groupName}":**\n${membersList}`);
    } catch (error) {
      console.error('Error showing group members:', error);
      message.reply('An error occurred while retrieving group members');
    }
  } else if (args[0] === 'remove' && args.length > 1) {
    // Delete a group
    const groupName = args.slice(1).join(' ');
    try {
      const result = await deleteGroup(groupName);
      if (result.success) {
        message.reply(`✅ Group "${groupName}" deleted successfully.`);
      } else {
        message.reply(`❌ Error deleting group: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting group:', error);
      message.reply('An error occurred while deleting the group');
    }
  }
}

async function handleHelpCommand(message) {
  message.reply(`
**Party SMS Bot Commands:**

**Invitations:**
\`!invite <group> <message>\` - Send SMS invitation to a group
\`!text <contact_name or phone> <message>\` - Send SMS to a single contact

**Contact Management:**
\`!contacts list\` - List all contacts
\`!contacts find <search_term>\` - Search for contacts
\`!contacts remove <id>\` - Remove a contact
\`!addcontact <name> <phone_number>\` - Add a new contact

**Group Management:**
\`!groups list\` - List all groups
\`!groups show <group_name>\` - Show members of a group
\`!groups remove <group_name>\` - Delete a group
\`!creategroup <group_name> [description]\` - Create a new group
\`!addtogroup <group_name> <contact_name>\` - Add a contact to a group
\`!removefromgroup <group_name> <contact_name>\` - Remove a contact from a group

\`!help\` - Show this help message
  `);
}

// Database helper functions
async function getGroupPhoneNumbers(groupName) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT c.phone_number 
      FROM contacts c
      JOIN group_contacts gc ON c.id = gc.contact_id
      JOIN groups g ON gc.group_id = g.id
      WHERE g.name = ?
    `;
    
    db.all(query, [groupName], (err, rows) => {
      if (err) return reject(err);
      resolve(rows ? rows.map(row => row.phone_number) : []);
    });
  });
}

async function getAllContacts() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM contacts ORDER BY name', [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

async function searchContacts(searchTerm) {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM contacts WHERE name LIKE ? OR phone_number LIKE ? ORDER BY name', 
      [`%${searchTerm}%`, `%${searchTerm}%`], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

async function getPhoneNumberByName(name) {
  return new Promise((resolve, reject) => {
    db.get('SELECT phone_number FROM contacts WHERE name LIKE ?', [`%${name}%`], (err, row) => {
      if (err) return reject(err);
      resolve(row ? row.phone_number : null);
    });
  });
}

async function addContact(name, phoneNumber) {
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO contacts (name, phone_number) VALUES (?, ?)',
      [name, phoneNumber], function(err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT') {
          resolve({ success: false, error: 'Phone number already exists' });
        } else {
          reject(err);
        }
      } else {
        resolve({ success: true, id: this.lastID });
      }
    });
  });
}

async function deleteContact(contactId) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM contacts WHERE id = ?', [contactId], function(err) {
      if (err) return reject(err);
      if (this.changes === 0) {
        resolve({ success: false, error: 'Contact not found' });
      } else {
        resolve({ success: true });
      }
    });
  });
}

async function getAllGroups() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM groups ORDER BY name', [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

async function getGroupMembers(groupName) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT c.* 
      FROM contacts c
      JOIN group_contacts gc ON c.id = gc.contact_id
      JOIN groups g ON gc.group_id = g.id
      WHERE g.name = ?
      ORDER BY c.name
    `;
    
    db.all(query, [groupName], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

async function createGroup(name, description) {
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO groups (name, description) VALUES (?, ?)',
      [name, description], function(err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT') {
          resolve({ success: false, error: 'Group name already exists' });
        } else {
          reject(err);
        }
      } else {
        resolve({ success: true, id: this.lastID });
      }
    });
  });
}

async function deleteGroup(groupName) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM groups WHERE name = ?', [groupName], function(err) {
      if (err) return reject(err);
      if (this.changes === 0) {
        resolve({ success: false, error: 'Group not found' });
      } else {
        resolve({ success: true });
      }
    });
  });
}

async function addContactToGroup(contactName, groupName) {
  return new Promise((resolve, reject) => {
    // Get contact ID
    db.get('SELECT id FROM contacts WHERE name LIKE ?', [`%${contactName}%`], (err, contact) => {
      if (err) return reject(err);
      if (!contact) return resolve({ success: false, error: 'Contact not found' });
      
      // Get group ID
      db.get('SELECT id FROM groups WHERE name = ?', [groupName], (err, group) => {
        if (err) return reject(err);
        if (!group) return resolve({ success: false, error: 'Group not found' });
        
        // Link contact to group
        db.run('INSERT OR IGNORE INTO group_contacts (group_id, contact_id) VALUES (?, ?)',
          [group.id, contact.id], function(err) {
          if (err) return reject(err);
          resolve({ success: true });
        });
      });
    });
  });
}

async function removeContactFromGroup(contactName, groupName) {
  return new Promise((resolve, reject) => {
    // Get contact ID
    db.get('SELECT id FROM contacts WHERE name LIKE ?', [`%${contactName}%`], (err, contact) => {
      if (err) return reject(err);
      if (!contact) return resolve({ success: false, error: 'Contact not found' });
      
      // Get group ID
      db.get('SELECT id FROM groups WHERE name = ?', [groupName], (err, group) => {
        if (err) return reject(err);
        if (!group) return resolve({ success: false, error: 'Group not found' });
        
        // Remove contact from group
        db.run('DELETE FROM group_contacts WHERE group_id = ? AND contact_id = ?',
          [group.id, contact.id], function(err) {
          if (err) return reject(err);
          if (this.changes === 0) {
            resolve({ success: false, error: 'Contact is not in this group' });
          } else {
            resolve({ success: true });
          }
        });
      });
    });
  });
}

// Create a table to store thread info if it doesn't exist
async function createThreadsTableIfNeeded() {
  return new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS conversation_threads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        thread_id TEXT NOT NULL,
        phone_number TEXT NOT NULL,
        name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

// Store thread information for persistence
async function storeThreadInfo(threadId, phoneNumbers, name) {
  await createThreadsTableIfNeeded();
  
  return new Promise((resolve, reject) => {
    const stmt = db.prepare('INSERT INTO conversation_threads (thread_id, phone_number, name) VALUES (?, ?, ?)');
    for (const phone of phoneNumbers) {
      stmt.run(threadId, phone, name);
    }
    stmt.finalize(err => {
      if (err) return reject(err);
      resolve();
    });
  });
}

// Handle incoming SMS
async function handleIncomingSMS(from, body, mediaUrls = []) {
  console.log(`Received SMS from ${from}: ${body}`);
  
  try {
    // Look up the thread ID for this phone number
    const threadId = await getThreadIdForPhone(from);
    
    if (threadId) {
      // Get the thread
      const channel = await findChannelWithThread(threadId);
      if (channel) {
        const thread = await channel.threads.fetch(threadId);
        if (thread) {
          // Format the message
          let message = `📱 **SMS from ${from}:** ${body}`;
          
          // Add media if present
          if (mediaUrls && mediaUrls.length > 0) {
            message += `\n🖼️ **Media Attached:** ${mediaUrls.join(', ')}`;
          }
          
          // Send to Discord thread
          await thread.send(message);
          return;
        }
      }
    }
    
    // If we get here, no thread was found, create a new one
    const channel = await getDefaultChannel();
    if (!channel) {
      console.error('No suitable channel found for incoming SMS');
      return;
    }
    
    // Try to get contact name
    const contact = await getContactByPhone(from);
    const contactName = contact ? contact.name : 'Unknown';
    
    // Create a thread
    const thread = await channel.threads.create({
      name: `SMS from ${contactName} (${from})`,
      autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
      reason: `Incoming SMS from ${from}`
    });
    
    // Format the message
    let message = `📱 **New SMS from ${contactName} (${from}):** ${body}`;
    
    // Add media if present
    if (mediaUrls && mediaUrls.length > 0) {
      message += `\n🖼️ **Media Attached:** ${mediaUrls.join(', ')}`;
    }
    
    await thread.send(message);
    
    // Register this thread
    activeThreads.set(from, thread.id);
    await storeThreadInfo(thread.id, [from], contactName);
    
    await thread.send(`📣 Reply in this thread to respond directly to ${contactName}.`);
  } catch (error) {
    console.error('Error handling incoming SMS:', error);
  }
}

async function getThreadIdForPhone(phoneNumber) {
  // First check in-memory cache
  if (activeThreads.has(phoneNumber)) {
    return activeThreads.get(phoneNumber);
  }
  
  // Then check database
  return new Promise((resolve, reject) => {
    db.get('SELECT thread_id FROM conversation_threads WHERE phone_number = ? ORDER BY created_at DESC LIMIT 1',
      [phoneNumber], (err, row) => {
      if (err) return reject(err);
      if (row) {
        // Update in-memory cache
        activeThreads.set(phoneNumber, row.thread_id);
      }
      resolve(row ? row.thread_id : null);
    });
  });
}

async function getContactByPhone(phoneNumber) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM contacts WHERE phone_number = ?', [phoneNumber], (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

async function findChannelWithThread(threadId) {
  // Get all guilds
  const guilds = client.guilds.cache.values();
  
  for (const guild of guilds) {
    try {
      // Get all channels in this guild
      const channels = await guild.channels.fetch();
      
      // Check each text channel
      for (const [, channel] of channels.filter(c => c.isTextBased() && !c.isVoiceBased())) {
        try {
          // Try to fetch the thread
          const thread = await channel.threads.fetch(threadId);
          if (thread) {
            return channel;
          }
        } catch (e) {
          // Thread not found in this channel, continue
        }
      }
    } catch (e) {
      console.error(`Error checking guild ${guild.id}:`, e);
    }
  }
  
  return null;
}

async function getDefaultChannel() {
  // Try to find a channel named "sms" or "bot" first
  const guilds = client.guilds.cache.values();
  
  for (const guild of guilds) {
    try {
      const channels = await guild.channels.fetch();
      
      // First preference: channels named sms or bot
      let channel = channels.find(c => c.isTextBased() && (c.name.toLowerCase() === 'sms' || c.name.toLowerCase() === 'bot'));
      
      if (channel) return channel;
      
      // Second preference: general channel
      channel = channels.find(c => c.isTextBased() && c.name.toLowerCase() === 'general');
      
      if (channel) return channel;
      
      // Last resort: first text channel we find
      channel = channels.find(c => c.isTextBased() && !c.isVoiceBased());
      
      if (channel) return channel;
    } catch (e) {
      console.error(`Error finding default channel in guild ${guild.id}:`, e);
    }
  }
  
  return null;
}

// Handle thread messages (replies to SMS)
client.on(Events.MessageCreate, async (message) => {
  // Check if message is in a thread and not from a bot
  if (!message.channel.isThread() || message.author.bot) return;
  
  const threadId = message.channel.id;
  
  try {
    // Find the phone number associated with this thread
    const phoneNumber = await getPhoneNumberForThread(threadId);
    
    if (phoneNumber) {
      // Send the message as an SMS
      const result = await sendSMS([phoneNumber], message.content);
      
      if (result.success) {
        await message.react('✅');
      } else {
        await message.react('❌');
        await message.reply(`Failed to send SMS: ${result.error}`);
      }
    }
  } catch (error) {
    console.error('Error handling thread message:', error);
    await message.react('❓');
  }
});

async function getPhoneNumberForThread(threadId) {
  // Check in database
  return new Promise((resolve, reject) => {
    db.get('SELECT phone_number FROM conversation_threads WHERE thread_id = ? LIMIT 1',
      [threadId], (err, row) => {
      if (err) return reject(err);
      resolve(row ? row.phone_number : null);
    });
  });
}

// Load active threads from database on startup
async function loadActiveThreads() {
  try {
    await createThreadsTableIfNeeded();
    
    return new Promise((resolve, reject) => {
      db.all('SELECT DISTINCT thread_id, phone_number FROM conversation_threads', [], (err, rows) => {
        if (err) return reject(err);
        
        if (rows) {
          for (const row of rows) {
            activeThreads.set(row.phone_number, row.thread_id);
          }
        }
        
        console.log(`Loaded ${activeThreads.size} active conversation threads`);
        resolve();
      });
    });
  } catch (error) {
    console.error('Error loading active threads:', error);
  }
}

// When the client is ready, run this code
client.once(Events.ClientReady, async () => {
  console.log(`🎮 Discord bot logged in as ${client.user.tag}`);
  
  // Load active threads
  await loadActiveThreads();
});

// Listen for messages
client.on(Events.MessageCreate, processCommand);

// Start the Discord bot
function startBot() {
  console.log('🤖 Starting Discord bot...');
  client.login(process.env.DISCORD_BOT_TOKEN)
    .then(() => console.log('🚀 Bot login successful!'))
    .catch(err => console.error('❌ Bot login failed:', err));
}

module.exports = { startBot, handleIncomingSMS };