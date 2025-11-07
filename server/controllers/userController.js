// ========== server/controllers/userController.js (FULL CODE) ==========
const User = require("../models/User");

// @desc    Update user profile (Bio, Gender, Vehicle, etc.)
// @route   PUT /api/users/update-profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  const { bio, gender, phone, vehicleDetails } = req.body;

  try {
    const fieldsToUpdate = { bio, gender, phone, vehicleDetails };

    // Find user by ID and update the fields provided in the body
    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true, // Return the new updated document
      runValidators: true, // Run schema validators on update
    });

    if (!user) {
      return next({ statusCode: 404, message: "User not found" });
    }

    // Exclude sensitive data before sending the updated user back
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: userResponse,
    });
  } catch (err) {
    // Handle validation errors or unique constraint errors
    next(err);
  }
};

// ... add other user-related controllers here ...
