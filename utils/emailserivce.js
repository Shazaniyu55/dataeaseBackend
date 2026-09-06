const { Resend } = require("resend");
require('dotenv').config()

const resend = new Resend(process.env.RESEND_API_KEY);

const APP_NAME = "DATA EASE";


const capitalizeEachWord = (str) => {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};



/**
 * Central function to send emails for niyu
 * @param to Recipient email address
 * @param subject Subject of the email
 * @param html HTML body of the email
 */

const sendEmail = async (to, subject, html) => {
  try {
    const response = await resend.emails.send({
      from: `${APP_NAME} <info@nexadataease.com>`, // change later to your domain
      to,
      subject,
      html,
    });

    console.log("Email sent:", response);
  } catch (error) {
    console.error("Email error:", error);
    throw error;
  }
};
/**
 * Send OTP email for verification
 * @param email Recipient's email address
 * @param otp One-time password
 */
const sendOtpEmail = async (email, otp) => {
  const subject = "Verify Your Email";
  const html = `
  <!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Verify Your Email</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #f7f7f7;
        margin: 0;
        padding: 0;
      }
      .email-container {
        max-width: 600px;
        margin: 20px auto;
        background-color: #ffffff;
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid #e0e0e0;
      }
      .header {
        background-color:rgba(0, 0, 0, 1);
        color: #ffffff;
        text-align: center;
        padding: 20px 10px;
      }
      .header img {
        max-width: 150px;
      }
      .content {
        padding: 20px;
        color: #333333;
      }
      .content h1 {
        font-size: 24px;
        color: rgba(255, 255, 255, 1);
      }
      .content p {
        font-size: 16px;
        line-height: 1.5;
      }
      .otp-code {
        display: block;
        text-align: center;
        margin: 20px 0;
        padding: 10px 20px;
        font-size: 20px;
        font-weight: bold;
        color: #ffffff;
        background-color: rgba(0, 0, 0, 1);
        border-radius: 5px;
      }
      .footer {
        background-color: #f7f7f7;
        color: #999999;
        text-align: center;
        padding: 10px 20px;
        font-size: 12px;
      }
      .footer a {
        color: rgba(0, 0, 0, 1);
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <div class="email-container">
      <div class="header">
        <img src="https://res.cloudinary.com/damufjozr/image/upload/v1725521798/ck4g8mgwfmkcvajr58ki.png" alt="${APP_NAME} Logo" />
        <h2>Verify Your Email</h2>
      </div>
      <div class="content">
        <h1>Welcome to ${APP_NAME}!</h1>
        <p>Hi there,</p>
        <p>Your OTP code is:</p>
        <span class="otp-code">${otp}</span>
        <p>
          Please use this code to verify your email address. This code will
          expire in 15 minutes.
        </p>
        <p>If you did not request this, please ignore this email.</p>
        <p>Thank you,<br />The ${APP_NAME} Team</p>
      </div>
      <div class="footer">
        <p>
          &copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
        </p>
        <p>
          <a href="">Terms of Service</a> |
          <a href="">Privacy Policy</a>
        </p>
      </div>
    </div>
  </body>
</html>  
  `;
  await sendEmail(email, subject, html);
};

/**
 * Send email for forgot password request
 * @param email Recipient's email address
 * @param otp One-time password
 */
 const sendForgotPasswordEmail = async (email, otp) => {
  const subject = "Reset Your Password";
  const html = `
  
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Reset Your Password</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #f7f7f7;
        margin: 0;
        padding: 0;
      }
      .email-container {
        max-width: 600px;
        margin: 20px auto;
        background-color: #ffffff;
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid #e0e0e0;
      }
      .header {
        background-color: rgb(30, 62, 243);
        color: #ffffff;
        text-align: center;
        padding: 20px 10px;
      }
      .header img {
        max-width: 150px;
      }
      .content {
        padding: 20px;
        color: #333333;
      }
      .content h1 {
        font-size: 24px;
        color: rgb(30, 62, 243);
      }
      .content p {
        font-size: 16px;
        line-height: 1.5;
      }
      .otp-code {
        display: block;
        text-align: center;
        margin: 20px 0;
        padding: 10px 20px;
        font-size: 20px;
        font-weight: bold;
        color: #ffffff;
        background-color: rgb(0, 0, 0);
        border-radius: 5px;
      }
      .footer {
        background-color: #f7f7f7;
        color: #999999;
        text-align: center;
        padding: 10px 20px;
        font-size: 12px;
      }
      .footer a {
        color: rgb(30, 62, 243);
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <div class="email-container">
      <div class="header">
        <img src="https://res.cloudinary.com/damufjozr/image/upload/v1772963971/logo_eyuhdo.png" alt="${APP_NAME} Logo" />
        <h2>Reset Your Password</h2>
      </div>
      <div class="content">
        <h1>Forgot Your Password?</h1>
        <p>Hi there,</p>
        <p>
          We received a request to reset your password. Use the Reset Url  below
          to reset it:
        </p>
        <span class="otp-code">${otp}</span>
        <p>If you did not request this, please ignore this email.</p>
        <p>Thank you,<br />The ${APP_NAME} Team</p>
      </div>
      <div class="footer">
        <p>
          &copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
        </p>
        <p>
          <a href="">Terms of Service</a> |
          <a href="">Privacy Policy</a>
        </p>
      </div>
    </div>
  </body>
</html>

  `;
  await sendEmail(email, subject, html);
};

/**
 * Send email for forgot password request
 * @param email Recipient's email address
 * @param fullName  full name
 */

 const sendLoginNotificationEmail = async (
  email,
  fullName
) => {
  const loginTime = new Date().toLocaleString();

  const subject = "New Login Detected on Your Account";
  const html = `
  
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Login Notification</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #f7f7f7;
        margin: 0;
        padding: 0;
      }
      .email-container {
        max-width: 600px;
        margin: 20px auto;
        background-color: #ffffff;
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid #e0e0e0;
      }
      .header {
        background-color: #fff;
        color: #4658ff;
        text-align: center;
        padding: 20px 10px;
      }
      .header img {
        max-width: 150px;
      }
      .content {
        padding: 20px;
        color: #333333;
      }
      .content h1 {
        font-size: 24px;
        color: #4658ff;
      }
      .content p {
        font-size: 16px;
        line-height: 1.5;
      }
      .login-details {
        background-color: #f7f7f7;
        padding: 15px;
        border-radius: 5px;
        margin: 20px 0;
      }
      .login-details p {
        margin: 5px 0;
      }
      .footer {
        background-color: #f7f7f7;
        color: #999999;
        text-align: center;
        padding: 10px 20px;
        font-size: 12px;
      }
      .footer a {
        color: #1cdb07;
        text-decoration: none;
      }
      .button {
        display: inline-block;
        margin: 20px 0;
        padding: 10px 20px;
        font-size: 16px;
        color: #ffffff;
        background-color: #4658ff;
        border-radius: 5px;
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <div class="email-container">
      <div class="header">
        <img src="https://res.cloudinary.com/damufjozr/image/upload/v1772963971/logo_eyuhdo.png" alt="${APP_NAME} Logo" />
        <h2>Login Notification</h2>
      </div>
      <div class="content">
        <h1>New Login Detected</h1>
      <p>Hi ${fullName ? capitalizeEachWord(fullName) : "User"},</p>
        <p>
          We noticed a recent login to your ${APP_NAME} account. If this was you, no further action is required. If you do not recognize this activity, please secure your account immediately.
        </p>
        <div class="login-details">
          <p><strong>Login Time:</strong> ${loginTime}</p>
        </div>
        <p>
          If this wasn't you, please change your password immediately and contact our support team.
        </p>
        <p>Thank you,<br />The ${APP_NAME} Team</p>
      </div>
      <div class="footer">
        <p>
          &copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
        </p>
        
      </div>
    </div>
  </body>
</html>
  `;
  await sendEmail(email, subject, html);
};



/**
 * Send rest url to email for forgot password request
 * @param email Recipient's email address
 * @param resetUrl  resetUrl
 */

const SendResetOTP = async (email, resetUrl) => {
  const subject = "Verify Your Email";
  const html = `
  <!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Reset Your Password</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #f7f7f7;
        margin: 0;
        padding: 0;
      }
      .email-container {
        max-width: 600px;
        margin: 20px auto;
        background-color: #ffffff;
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid #e0e0e0;
      }
      .header {
        background-color:rgba(0, 0, 0, 1);
        color: #ffffff;
        text-align: center;
        padding: 20px 10px;
      }
      .header img {
        max-width: 150px;
      }
      .content {
        padding: 20px;
        color: #333333;
      }
      .content h1 {
        font-size: 24px;
        color: rgba(255, 255, 255, 1);
      }
      .content p {
        font-size: 16px;
        line-height: 1.5;
      }
      .otp-code {
        display: block;
        text-align: center;
        margin: 20px 0;
        padding: 10px 20px;
        font-size: 20px;
        font-weight: bold;
        color: #ffffff;
        background-color: rgba(0, 0, 0, 1);
        border-radius: 5px;
      }
      .footer {
        background-color: #f7f7f7;
        color: #999999;
        text-align: center;
        padding: 10px 20px;
        font-size: 12px;
      }
      .footer a {
        color: rgba(0, 0, 0, 1);
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <div class="email-container">
      <div class="header">
        <img src="https://res.cloudinary.com/damufjozr/image/upload/v1747299593/icon-deal_rbfzjs.png" alt="${APP_NAME} Logo" />
        <h2>Reset Your Password</h2>
      </div>
      <div class="content">
        <h1>Welcome to ${APP_NAME}!</h1>
        <p>Hi there,</p>
        <p>Your Reset URL is:</p>
        <span class="">${resetUrl}</span>
        <p>
          Please use this code to verify your email address. This code will
          expire in 1 hour.
        </p>
        <p>If you did not request this, please ignore this email.</p>
        <p>Thank you,<br />The ${APP_NAME} Team</p>
      </div>
      <div class="footer">
        <p>
          &copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
        </p>
        <p>
          <a href="">Terms of Service</a> |
          <a href="">Privacy Policy</a>
        </p>
      </div>
    </div>
  </body>
</html>  
  `;
  await sendEmail(email, subject, html);
};

const SendPromotionalEmail = async (
  email,
  promoUrl,
  promoTitle,
  promoDescription,
  bannerImageUrl,  // <-- New banner image
  ctaText = "Learn More"
) => {
  const subject = "Exclusive Offer from " + APP_NAME;
  const html = `
  <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${promoTitle}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #f7f7f7;
      margin: 0;
      padding: 0;
    }
    .email-container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #e0e0e0;
    }
    .header {
      background-color: #272bf3;
      color: #ffffff;
      text-align: center;
      padding: 20px 10px;
    }
    .header img {
      max-width: 120px;
      margin-bottom: 10px;
    }
    .banner img {
      width: 100%;
      height: auto;
      display: block;
      margin-top: 10px;
    }
    .content {
      padding: 20px;
      color: #333333;
      text-align: center;
    }
    .content h1 {
      font-size: 24px;
      color: #1E4E79;
      margin-bottom: 10px;
    }
    .content p {
      font-size: 16px;
      line-height: 1.5;
      margin-bottom: 15px;
    }
    .cta-button {
      display: inline-block;
      margin: 20px 0;
      padding: 12px 25px;
      font-size: 16px;
      color: #ffffff;
      background-color: #F57C00;
      border-radius: 5px;
      text-decoration: none;
      transition: background 0.3s ease;
    }
    .cta-button:hover {
      background-color: #e65100;
    }
    .footer {
      background-color: #f7f7f7;
      color: #999999;
      text-align: center;
      padding: 15px 20px;
      font-size: 12px;
    }
    .footer a {
      color: #1E4E79;
      text-decoration: none;
      margin: 0 5px;
    }
    @media only screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
      }
      .header img {
        max-width: 100px;
      }
      .banner img {
        max-width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <img src="https://res.cloudinary.com/damufjozr/image/upload/v1772963971/logo_eyuhdo.png" alt="${APP_NAME} Logo" />
      <h2>${APP_NAME} Special Offer!</h2>
    </div>

    <!-- Banner Image -->
    ${bannerImageUrl ? `<div class="banner"><img src="${bannerImageUrl}" alt="Promotional Banner" /></div>` : ""}

    <div class="content">
      <h1>${promoTitle}</h1>
      <p>${promoDescription}</p>
      <a href="${promoUrl}" class="cta-button">${ctaText}</a>
      <p>Thank you for being a valued member of ${APP_NAME}!</p>
    </div>

    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
      <p>
        <a href="">Terms of Service</a> | 
        <a href="">Privacy Policy</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;

  await sendEmail(email, subject, html);
};

module.exports = {sendOtpEmail, sendForgotPasswordEmail, sendLoginNotificationEmail, SendResetOTP, SendPromotionalEmail};


