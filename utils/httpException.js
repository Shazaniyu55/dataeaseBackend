class HttpException extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details || null;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    Object.setPrototypeOf(this, HttpException.prototype);
  }
}

module.exports = HttpException;
