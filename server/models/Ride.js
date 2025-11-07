// ========== server/models/Ride.js ==========
const mongoose = require("mongoose");

const rideSchema = new mongoose.Schema(
  {
    driver: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
    },
    origin: {
      address: { type: String, required: true },
      city: { type: String, required: true },
      coordinates: {
        // For future GPS integration
        type: [Number], // [longitude, latitude]
        index: "2dsphere",
      },
    },
    destination: {
      address: { type: String, required: true },
      city: { type: String, required: true },
      coordinates: {
        // For future GPS integration
        type: [Number], // [longitude, latitude]
        index: "2dsphere",
      },
    },
    departureTime: {
      type: Date,
      required: true,
    },
    availableSeats: {
      type: Number,
      required: [true, "Please specify the number of available seats"],
      min: 1,
      max: 7, // Max seats in a carpool (excluding driver)
    },
    pricePerSeat: {
      type: Number,
      required: [true, "Please specify the price per seat (in INR)"],
      min: 0,
    },
    distance: {
      // Mocked from calculateDistance utility
      type: Number,
      default: 0,
    },
    estimatedDuration: {
      // Mocked from calculateDistance utility
      type: Number,
      default: 0,
    },
    vehicleDetails: {
      type: Object,
      // Can embed vehicle details or pull from User.vehicleDetails
    },
    notes: {
      type: String,
      maxlength: 500,
    },
    passengers: [
      {
        user: {
          type: mongoose.Schema.ObjectId,
          ref: "User",
        },
        seatsBooked: {
          type: Number,
          required: true,
          min: 1,
        },
        pickupPoint: {
          address: String,
        },
        dropPoint: {
          address: String,
        },
        status: {
          type: String,
          enum: ["pending", "confirmed", "cancelled", "completed"],
          default: "pending",
        },
        bookedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    status: {
      type: String,
      enum: ["active", "full", "completed", "cancelled"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

// Virtual field to calculate remaining seats easily in controllers
rideSchema.virtual("seatsTaken").get(function () {
  return this.passengers.reduce((acc, p) => {
    if (p.status === "confirmed" || p.status === "pending") {
      return acc + p.seatsBooked;
    }
    return acc;
  }, 0);
});

// Method to get remaining seats
rideSchema.methods.getRemainingSeats = function () {
  return this.availableSeats - this.seatsTaken;
};

// Ensure virtuals are included when converting to JSON
rideSchema.set("toObject", { virtuals: true });
rideSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("Ride", rideSchema);
