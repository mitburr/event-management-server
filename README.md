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
2. Install dependencies with `npm install`
3. Create a Firebase project and get service account credentials
4. Update the `.env` file with your Firebase configuration
5. Start the server with `npm start`

### Android Phone Setup

1. Install Tasker and AutoTools from Google Play Store
2. Set up Firebase Cloud Messaging in Tasker (instructions coming soon)
3. Configure Tasker profile to send SMS when FCM message is received

## API Endpoints

- `POST /api/sms/send` - Send SMS to specified phone numbers
- `GET/POST /api/contacts` - Manage contacts
- `GET/POST /api/groups` - Manage contact groups
- `GET/POST /api/invitations` - Manage invitation templates

## License

ISC
