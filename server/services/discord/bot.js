const { Client, GatewayIntentBits, Events } = require('discord.js');
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
  ]
});

// Command prefix
const PREFIX = '!';

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
      
    default:
      message.reply('Unknown command. Type `!help` to see available commands.');
  }
}

// Handle invite command: !invite <group> <message>
// In handleInviteCommand function inside server/services/discord/bot.js

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
        return message.reply(`NO CONTACTS FOUND IN "${groupName}"! HOW CAN WE PARTY WITH NO GUESTS? 😱`);
      }
      
      // Send the invitation with EXTREME ENTHUSIASM
      message.channel.send(`🚀 BLASTING INVITATION TO ${partyPeople.length} PARTY PEOPLE! STAND BY! 🚀`);
      
      const result = await sendSMS(partyPeople, smsMessage, partyPicUrl);
      
      if (result.success) {
        message.reply(`✅ WOOHOO! INVITATION SENT TO ${partyPeople.length} AWESOME PEOPLE! LET'S PARTY! 🎉🎉🎉`);
      } else {
        message.reply(`❌ OH NO! PARTY FAIL: ${result.error} 😭`);
      }
    } catch (error) {
      console.error('PARTY PLANNING CATASTROPHE:', error);
      message.reply('AN ERROR CRASHED OUR PARTY PLANNING COMMITTEE! TRY AGAIN LATER! 🚑');
    }
  }
// Add this function at the appropriate place in your file

async function getGroupPhoneNumbers(groupName) {
    // Implement getting phone numbers for a specific group from database
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
  
  // And also complete the stub implementations for these functions
  async function handleContactsCommand(message, args) {
    if (!args.length || args[0] === 'list') {
      // List all contacts
      db.all('SELECT * FROM contacts', [], (err, rows) => {
        if (err) {
          console.error(err);
          return message.reply('Failed to retrieve contacts');
        }
        
        if (rows.length === 0) {
          return message.reply('No contacts found');
        }
        
        const contactsList = rows.map(c => `${c.id}: ${c.name} (${c.phone_number})`).join('\n');
        message.reply(`**Contacts List:**\n${contactsList}`);
      });
    }
  }
  
  async function handleGroupsCommand(message, args) {
    if (!args.length || args[0] === 'list') {
      // List all groups
      db.all('SELECT * FROM groups', [], (err, rows) => {
        if (err) {
          console.error(err);
          return message.reply('Failed to retrieve groups');
        }
        
        if (rows.length === 0) {
          return message.reply('No groups found');
        }
        
        const groupsList = rows.map(g => `${g.id}: ${g.name} - ${g.description || 'No description'}`).join('\n');
        message.reply(`**Groups List:**\n${groupsList}`);
      });
    }
  }
  
  async function handleHelpCommand(message) {
    message.reply(`
  **Party SMS Bot Commands:**
  \`!invite <group> <message>\` - Send SMS invitation to a group
  \`!contacts list\` - List all contacts
  \`!groups list\` - List all groups
  \`!help\` - Show this help message
    `);
  }


// When the client is ready, run this code
client.once(Events.ClientReady, () => {
    console.log(`🎮 Discord bot logged in as ${client.user.tag}`);
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
  
  module.exports = { startBot };