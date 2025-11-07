// ========== server/middleware/auth.js (CORRECTED) ==========
const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Express middleware to protect routes, ensuring the user is logged in
 */
exports.protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      // Get token from header (Format: Bearer <token>)
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return next({
        statusCode: 401,
        message: "Not authorized to access this route. Token missing.",
      });
    }

    try {
      // Verify token and decode payload
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Attach user to request object (excluding sensitive data, fetching all properties here)
      const user = await User.findById(decoded.id);

      if (!user) {
        return next({
          statusCode: 404,
          message: "User not found or token expired",
        });
      }

      // Attach minimal user info to request (or the whole user object if needed)
      req.user = {
        id: user._id.toString(),
        fullName: user.fullName,
        email: user.email,
      };

      next();
    } catch (error) {
      // Handle invalid or expired JWT
      return next({ statusCode: 401, message: "Invalid or expired token" });
    }
  } catch (error) {
    console.error("Auth middleware fatal error:", error);
    next({
      statusCode: 500,
      message: "Authentication failed due to server error",
    });
  }
};
