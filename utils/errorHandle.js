const { ZodError } = require("zod");
const HttpException = require("./httpException");
const Logger = require("../middlewares/log");

const formatZodError = (error) => {
  return error.errors.map((err) => ({
    path: err.path.join("."),
    message: err.message,
    code: err.code,
  }));
};

const errorHandler = (method) => {
  return async (req, res, next) => {
    try {
      await method(req, res, next);
    } catch (error) {
      Logger.logger.error("Error caught in errorHandler:", error);

      let status = 500;
      let message = "Internal Server Error";
      let details = null;

      if (error instanceof HttpException) {
        status = error.status;
        message = error.message;
        details = error.details;
      } else if (error instanceof ZodError) {
        status = 400;
        message = "Validation Error";
        details = formatZodError(error);
      } else if (error instanceof Error) {
        switch (error.message) {
          case "Authorization denied":
            status = 401;
            message = "Authorization denied";
            break;
          case "Not Authorized":
            status = 403;
            message = "Not Authorized";
            break;
          case "Not Found":
            status = 404;
            message = "Resource Not Found";
            break;
          case "Bad Request":
            status = 400;
            message = "Bad Request";
            break;
          default:
            message = error.message || "Internal Server Error";
            details = error;
            break;
        }
      } else {
        details = error;
      }

      res.status(status).json({
        status,
        success: false,
        message,
        details,
      });

      Logger.logger.error(
        `Error Response Sent: ${JSON.stringify({ status, message, details })}`
      );
    }
  };
};

module.exports = { errorHandler };
