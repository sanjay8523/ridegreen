// ========== server/models/User.js (CRITICAL FIX: BCrypt Error Handling) ==========
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Please provide your full name"],
      trim: true,
      minlength: 3,
      maxlength: 50,
    },
    email: {
      type: String,
      required: [true, "Please provide an email"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email",
      ],
    },
    phone: {
      type: String,
      required: [true, "Please provide a phone number"],
      unique: true,
      match: [/^[0-9]{10}$/, "Please provide a valid 10-digit phone number"],
    },
    password: {
      type: String,
      required: [true, "Please provide a password"],
      minlength: 6,
      select: false, // Do not return the password hash by default
    },
    avatar: {
      type: String, // Default avatar generated based on name if none is provided
      default: function () {
        return `https://ui-avatars.com/api/?background=10b981&color=fff&name=${encodeURIComponent(
          this.fullName
        )}`;
      },
    },
    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer-not-to-say"],
    },
    bio: {
      type: String,
      maxlength: 500,
    },
    verified: {
      // Vehicle/ID verification for trust
      type: Boolean,
      default: false,
    },
    rating: {
      average: {
        type: Number,
        default: 5.0,
        min: 0,
        max: 5,
      },
      count: {
        type: Number,
        default: 0,
      },
    },
    ridesAsDriver: {
      type: Number,
      default: 0,
    },
    ridesAsPassenger: {
      type: Number,
      default: 0,
    },
    carbonSaved: {
      // For the green/sustainability feature
      type: Number,
      default: 0,
    },
    moneySaved: {
      // For the cost-saving feature
      type: Number,
      default: 0,
    },
    vehicleDetails: {
      make: String,
      model: String,
      year: Number,
      color: String,
      licensePlate: String,
      type: {
        type: String,
        enum: ["sedan", "suv", "hatchback", "van", "bike", "other"],
      },
    },
    preferences: {
      // User preferences for better ride matching
      music: { type: Boolean, default: true },
      pets: { type: Boolean, default: false },
      smoking: { type: Boolean, default: false },
      chattiness: {
        type: String,
        enum: ["quiet", "moderate", "chatty"],
        default: "moderate",
      },
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  {
    timestamps: true,
  }
);

// Hash password before saving - CRITICAL FIX APPLIED HERE
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    // CRITICAL: Ensure any error during hashing is explicitly passed
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
