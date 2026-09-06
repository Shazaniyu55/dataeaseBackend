// config/twilio.config.js
require('dotenv').config();

const twilioConfig = {
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  phoneNumber: process.env.TWILIO_PHONE_NUMBER, // Your Twilio sender number e.g. +1234567890
};


// Validate required env vars on startup
const requiredKeys = ['accountSid', 'authToken', 'phoneNumber'];
requiredKeys.forEach((key) => {
  if (!twilioConfig[key]) {
    throw new Error(`Missing Twilio config: ${key}. Check your .env file.`);
  }
});

module.exports = twilioConfig;