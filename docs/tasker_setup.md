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
```javascript
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
```

### Action 2: Download Image (if included)
1. Add an action: "If" condition
2. Set condition to: `%SMS_IMAGE_URL Set`
3. Add an action inside the If block: "Net" → "HTTP Request"
4. Set Method to GET
5. Set URL to: `%SMS_IMAGE_URL`
6. Set Output File to: `/storage/emulated/0/Download/invitation_image.jpg`
7. Add "End If" action

### Action 3: Send SMS to Each Recipient
1. Add an action: "Code" → "JavaScript"
2. Enter the following code:
```javascript
// Get the recipients list
var numbersString = global('SMS_NUMBERS');
var numbers = numbersString.split(',');
var message = global('SMS_MESSAGE');

// Set a global with the total count (for progress tracking)
setGlobal('SMS_TOTAL_COUNT', numbers.length);
setGlobal('SMS_CURRENT_COUNT', 0);

// Store the array for the For loop
setGlobal('SMS_NUMBERS_ARRAY', JSON.stringify(numbers));
```

3. Add an action: "Loop" → "For Variable"
4. Set "Variable" to: `%SMS_CURRENT_NUMBER`
5. Set "Items" to: `%SMS_NUMBERS_ARRAY`
6. Inside the loop, add:
   - Action: "Phone" → "Send SMS"
   - Number: `%SMS_CURRENT_NUMBER`
   - Message: `%SMS_MESSAGE`
   - If downloading the image worked, add:
     - Action: "Phone" → "Send MMS"
     - Number: `%SMS_CURRENT_NUMBER`
     - File: `/storage/emulated/0/Download/invitation_image.jpg`
7. Add "End For" action

## Step 4: Test the Setup

1. Use the API endpoint from your server to trigger a test message
2. Verify that your phone receives the FCM message and sends SMS

## Troubleshooting

- Ensure battery optimization is disabled for Tasker
- Check that your phone has permission to send SMS messages
- Verify your FCM API key is correctly entered in AutoTools

For more help, visit the [Tasker subreddit](https://www.reddit.com/r/tasker/) or the [Tasker Google Group](https://groups.google.com/g/tasker).
