const BlockedIP = require("../model/blockedIPModel");


// const WHITELIST_PATHS = [
//   "/api/v2/admin/login",
//   "/api/v2/auth/login",
//   "/api/v2/auth/register",
//   "/payment/success",
//   "/",
// ];


const ipBlockMiddleware = async (req, res, next) => {
  try {

    //  if (WHITELIST_PATHS.some((path) => req.path === path)) {
    //   return next();
    // }

    // get real IP (works behind Render / Railway / Nginx proxies)
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
      req.ip ||
      req.connection?.remoteAddress;

    if (!ip) {
      // localhost — never block during development
      return next();
    }

    const blocked = await BlockedIP.findOne({ ip, isActive: true });

    if (blocked) {
      return res.status(403).json({
        status: "failed",
        success: false,
        message: "Access denied",
        reason: blocked.reason,
      });
    }

    next();
  } catch (err) {
    // if the DB check fails, let the request through (fail open)
    // so a DB hiccup doesn't lock everyone out
    console.error("IP block middleware error:", err.message);
    next();
  }
};

module.exports = ipBlockMiddleware;