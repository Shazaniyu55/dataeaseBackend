// services/sms.service.js
const twilio = require('twilio');
const twilioConfig = require('../config/twilio');
const User = require('../model/usermodel');

const client = twilio(twilioConfig.accountSid, twilioConfig.authToken);

/**
 * Send an SMS to a specific phone number.
 * @param {string} to - Recipient phone number in E.164 format e.g. +2348012345678
 * @param {string} body - The message body
 * @returns {Promise<object>} Twilio message object
 */
const sendSms = async (to, body) => {
  const message = await client.messages.create({
    from: twilioConfig.phoneNumber,
    to,
    body,
  });
  return message;
};

/**
 * Send an SMS to a user fetched by their MongoDB user ID.
 * @param {string} userId - MongoDB ObjectId of the user
 * @param {string} body - The message body
 * @returns {Promise<object>} Twilio message object
 */
const sendSmsToUser = async (userId, body) => {
  const user = await User.findById(userId).select('name phoneNumber');

  if (!user) {
    throw new Error(`User with ID ${userId} not found.`);
  }

  if (!user.phoneNumber) {
    throw new Error(`User ${user.name} does not have a phone number on record.`);
  }

  const message = await sendSms(user.phoneNumber, body);
  return { user: user.name, phone: user.phoneNumber, messageSid: message.sid, status: message.status };
};

/**
 * Broadcast an SMS to all users in the database.
 * @param {string} body - The message body
 * @returns {Promise<object[]>} Array of results per user
 */
const broadcastSms = async (body) => {
  const users = await User.find({ phoneNumber: { $exists: true, $ne: null } }).select('name phoneNumber');

  if (!users.length) {
    throw new Error('No users with phone numbers found.');
  }


  const results = await Promise.allSettled(
    users.map((user) =>
      sendSms(user.phoneNumber, body).then((msg) => ({
        user: user.name,
        phone: user.phoneNumber,
        messageSid: msg.sid,
        status: msg.status,
      }))
    )
  );

  return results.map((result, i) =>
    result.status === 'fulfilled'
      ? { success: true, ...result.value }
      : { success: false, user: users[i].name, error: result.reason.message }
  );
};

module.exports = { sendSms, sendSmsToUser, broadcastSms };