// ========== server/controllers/authController.js (FINAL DEBUG LOGGING) ==========
const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const sendEmail = require("../utils/sendEmail");
const crypto = require("crypto");

// Utility to send token and user info
const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id); // Exclude password from response

  const userResponse = user.toObject();
  delete userResponse.password;

  res.status(statusCode).json({
    success: true,
    token,
    user: userResponse,
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  // CRITICAL: Log the incoming request body immediately
  console.log("\n--- IN REGISTER CONTROLLER ---");
  console.log("Request Body Received:", req.body);
  console.log("------------------------------\n");

  const { fullName, email, phone, password } = req.body;

  try {
    const user = await User.create({
      fullName,
      email,
      phone,
      password,
    });

    sendTokenResponse(user, 201, res);
  } catch (err) {
    // Log detailed database error if creation fails
    console.error("\n--- Mongoose Error Details START ---");
    console.error("Mongoose Registration Failed with:", err.name);
    console.error(err);
    console.error("--- Mongoose Error Details END ---\n");

    next(err); // Pass error to the errorHandler middleware
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  const { email, password } = req.body; // Basic validation

  if (!email || !password) {
    return next({
      statusCode: 400,
      message: "Please provide an email and password",
    });
  }

  try {
    // Check for user and select password explicitly
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return next({ statusCode: 401, message: "Invalid credentials" });
    } // Check if password matches

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return next({ statusCode: 401, message: "Invalid credentials" });
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    // req.user is set by the protect middleware
    const user = await User.findById(req.user.id);

    if (!user) {
      return next({ statusCode: 404, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Forgot Password
// @route   POST /api/auth/forgotpassword
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next({ statusCode: 404, message: "No user with that email" });
  } // Generate reset token and hash it (Mocked implementation for complexity)

  const resetToken = crypto.randomBytes(20).toString("hex");
  user.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

  await user.save({ validateBeforeSave: false }); // Create reset URL

  const resetUrl = `${req.protocol}://${req.get(
    "host"
  )}/resetpassword/${resetToken}`;

  const message = `
    <h1>Password Reset Request</h1>
    <p>You are receiving this because you (or someone else) have requested the reset of a password for your account.</p>
    <p>Please click on the link below to reset your password. This link will expire in 10 minutes.</p>
    <a href="${resetUrl}" clicktracking=off>${resetUrl}</a>
    <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
  `;

  try {
    await sendEmail({
      email: user.email,
      subject: "Password Reset Token (RideGreen)",
      html: message,
    });

    res.status(200).json({ success: true, data: "Email sent" });
  } catch (err) {
    console.error(err);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });

    return next({ statusCode: 500, message: "Email could not be sent" });
  }
};
