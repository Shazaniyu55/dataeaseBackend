const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

// Key by the logged-in account (so switching IPs doesn't help), falling back to IP.
// These must run AFTER authMiddleware so req.user is set.
const userKey = (req) =>
  req.user?.userId ? `user:${req.user.userId}` : ipKeyGenerator(req.ip);

const tooMany = (message) => ({ status: "failed", message });

// Starting a Paystack payment: 5 per 10 minutes per user
const fundWalletLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  keyGenerator: userKey,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: tooMany("Too many funding attempts. Please wait a few minutes and try again."),
});

// Verifying a payment (the app may poll this): 20 per minute per user
const verifyPaymentLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  keyGenerator: userKey,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: tooMany("Too many verification requests. Please slow down."),
});

// Manual (bank transfer) funding requests: 3 per hour per user
const manualFundingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  keyGenerator: userKey,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: tooMany("Too many manual funding requests. Please try again later."),
});

// Webhook: generous IP limit, only to absorb floods (Paystack retries legitimately)
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

module.exports = {
  fundWalletLimiter,
  verifyPaymentLimiter,
  manualFundingLimiter,
  webhookLimiter,
};