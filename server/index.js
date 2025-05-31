const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

const { startBot } = require('./services/discord/bot');
const { db } = require('./database/connection');

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();
  
  // Log request details
  console.log(`[${timestamp}] ${req.method} ${req.url} - IP: ${req.ip}`);
  
  // Log request body for non-GET requests (but mask sensitive data)
  if (req.method !== 'GET' && Object.keys(req.body).length > 0) {
    const safeBody = { ...req.body };
    // Mask sensitive fields if they exist
    if (safeBody.token) safeBody.token = '***MASKED***';
    if (safeBody.password) safeBody.password = '***MASKED***';
    if (safeBody.auth_token) safeBody.auth_token = '***MASKED***';
    
    console.log(`[${timestamp}] Request body:`, JSON.stringify(safeBody));
  }
  
  // Capture the original end method
  const originalEnd = res.end;
  
  // Override the end method to log the response
  res.end = function(chunk, encoding) {
    const duration = Date.now() - start;
    
    console.log(`[${timestamp}] ${req.method} ${req.url} - Status: ${res.statusCode} - Duration: ${duration}ms`);
    
    // Call the original end method
    return originalEnd.call(this, chunk, encoding);
  };
  
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ERROR: ${err.stack}`);
  
  // Log to file as well
  fs.appendFileSync(
    path.join(logsDir, 'error.log'), 
    `[${timestamp}] ${req.method} ${req.url} - ${err.stack}\n`
  );
  
  res.status(500).json({
    error: 'Server error',
    message: err.message
  });
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Import routes
const contactsRouter = require('./api/contacts');
const groupsRouter = require('./api/groups');
const invitationsRouter = require('./api/invitations');
const smsRoutes = require('./api/sms');

// Use routes
app.use('/api/contacts', contactsRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/invitations', invitationsRouter);
app.use('/api/sms', smsRoutes);

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Health check requested`);
  
  try {
    // Check database connection
    await new Promise((resolve, reject) => {
      db.get('SELECT 1', (err) => {
        if (err) {
          console.error(`[${timestamp}] Database health check failed:`, err);
          reject(err);
        } else {
          console.log(`[${timestamp}] Database connection successful`);
          resolve();
        }
      });
    });
    
    // Check Discord bot status
    const discordStatus = global.discordBot?.isReady() ? 'connected' : 'disconnected';
    console.log(`[${timestamp}] Discord bot status: ${discordStatus}`);
    
    const response = {
      status: 'healthy',
      timestamp: new Date(),
      services: {
        api: 'up',
        database: 'connected',
        discord: discordStatus
      }
    };
    
    console.log(`[${timestamp}] Health check response:`, JSON.stringify(response));
    res.json(response);
  } catch (error) {
    console.error(`[${timestamp}] Health check failed:`, error);
    
    // Log to file
    fs.appendFileSync(
      path.join(logsDir, 'health-check-errors.log'), 
      `[${timestamp}] Health check failed: ${error.stack || error}\n`
    );
    
    const errorResponse = {
      status: 'unhealthy',
      timestamp: new Date(),
      error: error.message,
      service: error.service || 'unknown'
    };
    
    res.status(500).json(errorResponse);
  }
});

// Root route
app.get('/', (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Root endpoint accessed`);
  res.json({ message: 'Party Invitation SMS Server API' });
});

// Start server
app.listen(PORT, () => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Server running on port ${PORT}`);
  
  // Start Discord bot
  startBot();
});

// Export the Discord bot instance for health checks
global.discordBot = require('./services/discord/bot').client;

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] UNCAUGHT EXCEPTION: ${err.stack}`);
  
  // Log to file
  fs.appendFileSync(
    path.join(logsDir, 'uncaught-exceptions.log'), 
    `[${timestamp}] ${err.stack}\n`
  );
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] UNHANDLED REJECTION:`, reason);
  
  // Log to file
  fs.appendFileSync(
    path.join(logsDir, 'unhandled-rejections.log'), 
    `[${timestamp}] ${reason.stack || reason}\n`
  );
});