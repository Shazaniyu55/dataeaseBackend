const { createLogger, transports, format } = require("winston");

/**
 * Vercel-safe Winston logger
 * - Console-only transport
 * - Structured JSON logs with timestamps
 * - Safe for serverless platforms
 */
class Logger {
  static logger = createLogger({
    level: "info",
    format: format.combine(
      format.timestamp(),
      format.errors({ stack: true }),
      format.json()
    ),
    transports: [
      new transports.Console(), // only console, no file writes
    ],
  });

  /**
   * Express middleware to log incoming requests
   */
  static logRequest(req, res, next) {
    Logger.logger.info("Incoming request", {
      method: req.method,
      url: req.originalUrl || req.url,
      ip: req.ip,
    });
    next();
  }
}

module.exports = Logger;


// const { createLogger, transports, format } = require("winston");

// // Logger class to handle logging functionality using Winston library.
// class Logger {
//   static logger = createLogger({
//     level: "info",
//     format: format.combine(format.timestamp(), format.json()),
//     transports: [
//       new transports.Console(),
//       new transports.File({
//         filename: "logs/error.log",
//         level: "error",
//         format: format.combine(
//           format.timestamp(),
//           format.errors({ stack: true }),
//           format.json()
//         ),
//       }),
//       new transports.File({ filename: "logs/combined.log" }),
//     ],
//   });

//   static logRequest(req, res, next) {
//     Logger.logger.info(`${req.method} ${req.url}`);
//     next();
//   }
// }

// module.exports = Logger;