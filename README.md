# Party Invitation SMS Server

A Node.js server that runs on a Raspberry Pi and sends party invitations via SMS using Twilio. Controlled through Discord commands.

## Features

- Send SMS party invitations through Discord commands
- Manage contacts and contact groups
- Use your own dedicated Twilio phone number
- Simple Discord bot interface - no custom UI needed

## Prerequisites

- Raspberry Pi running Node.js
- Discord account and server where you can add bots
- Twilio account (free trial available)

## Setup Instructions

### Server Setup

1. Clone this repository onto your Raspberry Pi
2. Install dependencies with `npm install`
3. Create a Discord bot at https://discord.com/developers/applications
4. Create a Twilio account at https://www.twilio.com and get a phone number
5. Update the `.env` file with your Discord and Twilio credentials
6. Start the server with `npm start`

### Discord Bot Setup

1. Create a new application at https://discord.com/developers/applications
2. Add a bot to your application
3. Enable message content intent in the bot settings
4. Generate an invite link with bot permissions
5. Invite the bot to your server
6. Copy your bot token to the `.env` file

## Discord Commands

- `!invite <group> <message>` - Send SMS to a group of contacts
- `!contacts list` - List all contacts
- `!groups list` - List all groups
- `!help` - Show available commands

## API Endpoints

- `POST /api/sms/send` - Send SMS to specified phone numbers
- `GET/POST /api/contacts` - Manage contacts
- `GET/POST /api/groups` - Manage contact groups
- `GET/POST /api/invitations` - Manage invitation templates

## License

ISC