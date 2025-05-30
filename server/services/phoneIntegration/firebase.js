const admin = require('firebase-admin');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize Firebase Admin
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
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
