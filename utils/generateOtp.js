const UserService = require('../services/userservice');

const OTP_EXPIRATION_TIME = 5 * 60 * 1000;

const generateOtp = async () => {
  let otp;
  let otpExists;

  do {
    otp = Math.floor(10000 + Math.random() * 90000).toString();
    otpExists = await UserService.checkOtpExists(otp);
  } while (otpExists);

  const otpExpiresAt = new Date(Date.now() + OTP_EXPIRATION_TIME);
  return { otp, otpExpiresAt };
};


module.exports = {generateOtp};


