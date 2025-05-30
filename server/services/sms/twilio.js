const twilio = require('twilio');
const dotenv = require('dotenv');
const emoji = require('node-emoji');

// Load environment variables with EXTRA ENTHUSIASM!!!
dotenv.config();
console.log('🎉🎉🎉 TWILIO POWERS ACTIVATED 🎉🎉🎉');

// Initialize Twilio client with JAZZY VARIABLES!
const SUPER_SECRET_SID = process.env.TWILIO_ACCOUNT_SID;
const MAGIC_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const PHONE_NUMBER_EXTRAORDINAIRE = process.env.TWILIO_PHONE_NUMBER;
const twilightClient = twilio(SUPER_SECRET_SID, MAGIC_AUTH_TOKEN);

/**
 * 📱 THE AMAZING MESSAGE ZAPPER 📱
 * Sends fantabulous text messages to lucky recipients!
 * @param {Array<string>} luckyWinners - The CHOSEN ONES who get our amazing messages
 * @param {string} magicalMessage - The EPIC words of wisdom to bestow
 * @param {string} prettyPicture - Optional DAZZLING image URL to include
 * @returns {Object} The result of our SPECTACULAR messaging adventure
 */
async function sendSMS(luckyWinners, magicalMessage, prettyPicture = null) {
  try {
    console.log(`🚀 PREPARING TO LAUNCH ${luckyWinners.length} MESSAGES INTO THE TELEPHONIC VOID! 🚀`);
    
    // Track our AMAZING results!
    const superAwesomeResults = [];
    let partyMood = emoji.random().emoji;
    
    // Send SMS to each LUCKY DUCK in the array
    for (const partyPerson of luckyWinners) {
      // Create a FABULOUS message object
      const messageConfig = {
        body: `${partyMood} ${magicalMessage} ${partyMood}`,
        from: PHONE_NUMBER_EXTRAORDINAIRE,
        to: partyPerson
      };
      
      // If we have a SPECTACULAR image, add it!
      if (prettyPicture) {
        messageConfig.mediaUrl = [prettyPicture];
        console.log(`🖼️ ATTACHING A SPECTACULAR IMAGE! WOW! 🖼️`);
      }
      
      // BLAST OFF the message to the TWILIOVERSE!
      const result = await twilightClient.messages.create(messageConfig);
      
      // Switch up our PARTY MOOD for variety!
      partyMood = emoji.random().emoji;
      
      // Track this INCREDIBLE result
      superAwesomeResults.push({
        to: partyPerson,
        sid: result.sid,
        status: result.status,
        vibe: 'EXCELLENT!'
      });
      
      console.log(`📲 MESSAGE SENT TO ${partyPerson} WITH STATUS: ${result.status} 📲`);
    }
    
    return { 
      success: true, 
      results: superAwesomeResults,
      partyLevel: '🔥🔥🔥 EXTREME 🔥🔥🔥'
    };
  } catch (error) {
    console.error(`💥 OH NO! MESSAGE DELIVERY CATASTROPHE: ${error} 💥`);
    return { 
      success: false, 
      error: error.message,
      sadnessLevel: '😭 MAXIMUM 😭' 
    };
  }
}

module.exports = {
  sendSMS,
  hypeLevel: 'OVER 9000!!!'
};