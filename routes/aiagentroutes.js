const express = require("express");
const rateLimit = require("express-rate-limit");
const aiAgentController = require("../controller/aiAgentController");
const { errorHandler } = require("../utils/errorHandle");
const authMiddleware = require("../middlewares/authMiddleware");
const { killSwitchGuard } = require("../middlewares/killswitchmiddleware");

const aiRouter = express.Router();

// 20 AI turns / 10 min per user (each turn can cost several model calls)
const aiLimit = rateLimit({
  max: 20, windowMs: 10 * 60 * 1000,
  keyGenerator: (req) => String(req.user?.userId),
  validate: { keyGeneratorIpFallback: false },
  message: { success: false, status: 429, message: "Slow down a little and try again shortly." },
});

aiRouter.post("/chat", killSwitchGuard("ai-agent"), authMiddleware, aiLimit, errorHandler(aiAgentController.chat));
module.exports = aiRouter;