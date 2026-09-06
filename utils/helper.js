const crypto = require("crypto");
 

const generateRequestId = () => {
  const now = new Date();
  // VTpass expects Africa/Lagos (WAT) time
  const lagosTime = new Date(now.toLocaleString("en-US", { timeZone: "Africa/Lagos" }));

  const pad = (n) => String(n).padStart(2, "0");

  const timestamp =
    lagosTime.getFullYear() +
    pad(lagosTime.getMonth() + 1) +
    pad(lagosTime.getDate()) +
    pad(lagosTime.getHours()) +
    pad(lagosTime.getMinutes());

  const random = Math.random().toString(36).substring(2, 12); // random alphanumeric suffix

  return `${timestamp}${random}`;
};

module.exports = generateRequestId;
// ── helper: hash a token for storage (same pattern as OTP/reset tokens) ───────
function hashToken(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}
 
// ── helper: build a human-readable device label from the request ──────────────
function deviceLabel(req) {
  const ua  = req.headers["user-agent"] || "Unknown device";
  const ip  = req.ip || req.connection?.remoteAddress || "Unknown IP";
  const time = new Date().toISOString().split("T")[0]; // "2026-05-14"
 
  // Shrink the UA to something readable
  let device = "Browser";
  if (/Mobile|Android|iPhone|iPad/i.test(ua)) device = "Mobile";
  else if (/Postman/i.test(ua))               device = "Postman";
 
  return `${device} · ${ip} · ${time}`;
}

const authHeader = (token) => ({
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

module.exports = {
  hashToken,
  deviceLabel,
  authHeader,
  generateRequestId
};


