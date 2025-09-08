// const { throws } = require("assert");

// class AppError extends Error {
//   constructor(message, statusCode) {
//     super(message);

//     this.statusCode = statusCode;
//     this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
//     this.isOperational = true;
//     Error.captureStackTrace(this, this.constructor);
//   }
// }
// module.exports = AppError;
class AppError extends Error {
  constructor(message, statusCode, data = {}) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;
    this.data = data; // Optional custom data (e.g., error code, details)
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Returns the error as a JSON response object
   * @returns {Object} JSON response structure
   */
  toJSON() {
    return {
      status: this.status,
      message: this.message,
      ...(this.data && Object.keys(this.data).length > 0 && { data: this.data }),
      ...(process.env.NODE_ENV === "development" && { stack: this.stack }), // Include stack trace in development
    };
  }
}

module.exports = AppError;