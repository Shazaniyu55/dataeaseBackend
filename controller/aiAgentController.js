const { z } = require("zod");
const HttpException = require("../utils/httpException");
const successResponse = require("../utils/successresponse");
const { runAgent } = require("../services/aiShoppingAgent");

const bodySchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1).max(2000),
  })).min(1).max(20),
});

const aiAgentController = {
  chat: async (req, res) => {
    if (!process.env.ANTHROPIC_API_KEY) throw new HttpException(503, "AI assistant is not configured");
    const { messages } = bodySchema.parse(req.body);
    if (messages[0].role !== "user" || messages[messages.length - 1].role !== "user") {
      throw new HttpException(400, "Conversation must start and end with a user message");
    }
    const result = await runAgent({ userId: req.user.userId, messages });
    return successResponse(res, result, "OK", 200);
  },
};
module.exports = aiAgentController;