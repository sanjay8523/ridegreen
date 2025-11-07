// ========== server/middleware/errorHandler.js (FINAL DEBUG VERSION) ==========
const errorHandler = (err, req, res, next) => {
  let error = { ...err };

  // Set default message/status
  error.message = err.message;
  error.statusCode = err.statusCode || 500;

  // Log the detailed error stack for developers (CRITICAL DEBUG STEP)
  console.error("--- SERVER ERROR CAUGHT ---");
  console.error(err.stack);
  console.error("---------------------------");

  // Mongoose Duplicate Key Error (Code 11000) - ROBUST FIX
  if (err.code === 11000 && err.keyPattern) {
    const field = Object.keys(err.keyPattern)[0];
    const message = `Registration failed: The value for the field '${field}' is already registered. Please use a unique ${field}.`;
    error = { statusCode: 400, message };
  } else if (err.code === 11000) {
    // Fallback parsing for other MongoDB versions/structures
    const message = `Registration failed: A unique field constraint was violated (Code 11000).`;
    error = { statusCode: 400, message };
  }

  // Mongoose Validation Error (required fields, minlength, etc.)
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
    error = { statusCode: 400, message };
  }

  // Return the error in the format the frontend expects
  res.status(error.statusCode).json({
    success: false,
    // Ensure the message is sent under the 'error' key, as the frontend expects
    error: error.message || "A generic server error occurred.",
  });
};

module.exports = { errorHandler };
