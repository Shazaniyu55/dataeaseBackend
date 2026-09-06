const crypto = require("crypto");
const { jwtVerify } = require("../utils/jwts");
const User  = require("../model/usermodel");
const Admin = require("../model/adminmodel");

function hashToken(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

const authMiddleware = async (req, res, next) => {
  const bearer = req.header("Authorization");

  if (!bearer || !bearer.startsWith("Bearer ")) {
    return res.status(403).json({
      status: 403, success: false, message: "Access denied",
    });
  }

  const token = bearer.split(" ")[1];

  // Step 1 — verify JWT signature
  let decoded;
  try {
    decoded = await new Promise((resolve, reject) => {
      jwtVerify(token, (error, user) => {
        if (error) reject(error);
        else resolve(user);
      });
    });
  } catch (error) {
    return res.status(401).json({
      status: 401,
      success: false,
      message: error.name === "TokenExpiredError"
        ? "Token has expired"
        : "Invalid token",
    });
  }

  // Step 2 — find account in User OR Admin collection
  let account = await User.findById(decoded.userId).select("+activeSessionToken");

  let isAdmin = false;
  if (!account) {
    account = await Admin.findById(decoded.userId);
    isAdmin = true;
  }

  if (!account) {
    return res.status(401).json({
      status: 401, success: false, message: "Account not found",
    });
  }

  // Step 3 — session token check (only for regular users, not admins)
  if (!isAdmin) {
    if (!account.activeSessionToken) {
      return res.status(401).json({
        status: 401, success: false, message: "Session expired. Please log in again.",
      });
    }

    if (hashToken(token) !== account.activeSessionToken) {
      return res.status(401).json({
        status: 401, success: false,
        message: "Session invalidated. Your account was logged in on another device.",
      });
    }
  }

  // All checks passed
  req.user = decoded;
  next();
};

module.exports = authMiddleware;
module.exports.authMiddleware = authMiddleware;