// ========== server/controllers/rideController.js ==========
const Ride = require("../models/Ride");
const User = require("../models/User");
const { calculateDistance } = require("../utils/calculateDistance");

// @desc    Create a new ride (Post Ride)
// @route   POST /api/rides/create
// @access  Private
exports.createRide = async (req, res, next) => {
  try {
    const {
      origin,
      destination,
      departureTime,
      availableSeats,
      pricePerSeat,
      vehicleDetails,
      notes,
    } = req.body;

    // Use mock distance/duration utility (for free tier)
    const { distance, estimatedDuration } = calculateDistance(
      origin,
      destination
    );

    const ride = await Ride.create({
      driver: req.user.id,
      origin,
      destination,
      departureTime,
      availableSeats,
      pricePerSeat,
      distance,
      estimatedDuration,
      vehicleDetails,
      notes,
    });

    await ride.populate("driver", "fullName avatar rating phone");

    // Emit real-time event that a new ride was created
    const io = req.app.get("io");
    io.emit("ride_created", ride);

    res.status(201).json({
      success: true,
      message: "Ride created successfully",
      ride,
    });
  } catch (error) {
    console.error("Create ride error:", error);
    next({
      statusCode: 500,
      message: "Failed to create ride: " + error.message,
    });
  }
};

// @desc    Search for available rides
// @route   GET /api/rides/search
// @access  Private
exports.searchRides = async (req, res, next) => {
  try {
    const {
      originCity,
      destinationCity,
      date,
      seats = 1,
      maxPrice,
      vehicleType,
    } = req.query;

    const query = {
      // Case-insensitive search on city names
      "origin.city": new RegExp(originCity, "i"),
      "destination.city": new RegExp(destinationCity, "i"),
      status: "active",
      driver: { $ne: req.user.id }, // Exclude rides posted by the searching user
    };

    // Date filter: Search within the whole day
    if (date) {
      const searchDate = new Date(date);
      const nextDay = new Date(searchDate);
      nextDay.setDate(nextDay.getDate() + 1);

      query.departureTime = {
        $gte: searchDate,
        $lt: nextDay,
      };
    } else {
      // Only show rides that haven't departed yet
      query.departureTime = { $gte: new Date() };
    }

    // Price filter
    if (maxPrice) {
      query.pricePerSeat = { $lte: Number(maxPrice) };
    }

    // Vehicle type filter
    if (vehicleType) {
      query["vehicleDetails.type"] = vehicleType;
    }

    const rides = await Ride.find(query)
      .populate("driver", "fullName avatar rating phone verified")
      .sort({ departureTime: 1 }) // Show earlier rides first
      .limit(50);

    // Filter rides with enough available seats (using the virtual field)
    const availableRides = rides.filter((ride) => {
      return ride.getRemainingSeats() >= Number(seats);
    });

    res.status(200).json({
      success: true,
      count: availableRides.length,
      rides: availableRides,
    });
  } catch (error) {
    console.error("Search rides error:", error);
    next({
      statusCode: 500,
      message: "Failed to search rides: " + error.message,
    });
  }
};

// @desc    Request to book a seat on a ride
// @route   POST /api/rides/book
// @access  Private
exports.bookRide = async (req, res, next) => {
  try {
    const { rideId, seatsBooked, pickupPoint, dropPoint } = req.body;
    const passengerId = req.user.id;

    const ride = await Ride.findById(rideId).populate(
      "driver",
      "fullName email phone"
    );

    if (!ride) {
      return next({ statusCode: 404, message: "Ride not found" });
    }

    if (ride.driver._id.toString() === passengerId) {
      return next({
        statusCode: 400,
        message: "You cannot book your own ride",
      });
    }

    // Check if user already has a pending/confirmed booking
    const existingBooking = ride.passengers.find(
      (p) =>
        p.user.toString() === passengerId &&
        (p.status === "confirmed" || p.status === "pending")
    );

    if (existingBooking) {
      return next({
        statusCode: 400,
        message:
          "You already have a pending or confirmed request for this ride",
      });
    }

    // Check available seats
    if (ride.getRemainingSeats() < seatsBooked) {
      return next({ statusCode: 400, message: "Not enough seats available" });
    }

    // Add passenger to the ride's passengers array
    ride.passengers.push({
      user: passengerId,
      seatsBooked,
      pickupPoint,
      dropPoint,
      status: "pending",
    });

    await ride.save();

    // Send notification to the driver (real-time)
    const io = req.app.get("io");
    const activeUsers = req.app.get("activeUsers");
    const driverSocketId = activeUsers.get(ride.driver._id.toString());

    if (driverSocketId) {
      io.to(driverSocketId).emit("booking_request", {
        rideId: ride._id,
        passengerId: passengerId,
        passengerName: req.user.fullName,
        seatsBooked,
        message: `${req.user.fullName} requested ${seatsBooked} seat(s) on your ride!`,
      });
    }

    res.status(200).json({
      success: true,
      message:
        "Booking request sent successfully to the driver. Awaiting confirmation.",
      ride,
    });
  } catch (error) {
    console.error("Book ride error:", error);
    next({ statusCode: 500, message: "Failed to book ride: " + error.message });
  }
};

// @desc    Driver confirms or rejects a booking request
// @route   PUT /api/rides/booking/:id
// @access  Private (Driver only)
exports.updateBookingStatus = async (req, res, next) => {
  try {
    const { passengerId, status } = req.body;
    const rideId = req.params.id;

    const ride = await Ride.findById(rideId);

    if (!ride) {
      return next({ statusCode: 404, message: "Ride not found" });
    }

    // Authorization check: Only the driver can update status
    if (ride.driver.toString() !== req.user.id) {
      return next({
        statusCode: 403,
        message: "Not authorized to update this booking status",
      });
    }

    const passenger = ride.passengers.find(
      (p) => p.user.toString() === passengerId
    );

    if (!passenger) {
      return next({ statusCode: 404, message: "Passenger booking not found" });
    }

    if (!["confirmed", "rejected"].includes(status)) {
      return next({ statusCode: 400, message: "Invalid status update" });
    }

    // Check capacity before confirming
    if (
      status === "confirmed" &&
      ride.getRemainingSeats() < passenger.seatsBooked &&
      passenger.status !== "confirmed"
    ) {
      return next({
        statusCode: 400,
        message: "Cannot confirm, not enough seats left",
      });
    }

    passenger.status = status;
    await ride.save();

    // If ride becomes full, update ride status
    if (ride.getRemainingSeats() === 0 && ride.status !== "full") {
      ride.status = "full";
      await ride.save();
    }

    // Send real-time notification to the passenger
    const io = req.app.get("io");
    const activeUsers = req.app.get("activeUsers");
    const passengerSocketId = activeUsers.get(passengerId);

    if (passengerSocketId) {
      io.to(passengerSocketId).emit("booking_update", {
        rideId: ride._id,
        status,
        message:
          status === "confirmed"
            ? `Your ride from ${ride.origin.city} to ${ride.destination.city} has been confirmed!`
            : "Your ride request was declined.",
      });
    }

    res.status(200).json({
      success: true,
      message: `Booking ${status} successfully`,
      ride,
    });
  } catch (error) {
    console.error("Update booking error:", error);
    next({
      statusCode: 500,
      message: "Failed to update booking status: " + error.message,
    });
  }
};

// @desc    Get rides posted by the user (as a driver)
// @route   GET /api/rides/my-rides
// @access  Private
exports.getMyRides = async (req, res, next) => {
  try {
    const rides = await Ride.find({ driver: req.user.id })
      .populate("passengers.user", "fullName avatar rating phone")
      .sort({ departureTime: -1 });

    res.status(200).json({
      success: true,
      count: rides.length,
      rides,
    });
  } catch (error) {
    next({ statusCode: 500, message: "Failed to fetch your posted rides" });
  }
};

// @desc    Get rides booked by the user (as a passenger)
// @route   GET /api/rides/my-bookings
// @access  Private
exports.getMyBookings = async (req, res, next) => {
  try {
    // Find rides where the user is listed as a passenger
    const rides = await Ride.find({
      "passengers.user": req.user.id,
    })
      .populate("driver", "fullName avatar rating phone verified")
      .sort({ departureTime: -1 });

    res.status(200).json({
      success: true,
      count: rides.length,
      rides,
    });
  } catch (error) {
    next({ statusCode: 500, message: "Failed to fetch your bookings" });
  }
};

// @desc    Cancel a posted ride
// @route   PUT /api/rides/cancel/:id
// @access  Private (Driver only)
exports.cancelRide = async (req, res, next) => {
  try {
    const rideId = req.params.id;
    const { reason } = req.body;

    const ride = await Ride.findById(rideId);

    if (!ride) {
      return next({ statusCode: 404, message: "Ride not found" });
    }

    if (ride.driver.toString() !== req.user.id) {
      return next({
        statusCode: 403,
        message: "Only the driver can cancel this ride",
      });
    }

    ride.status = "cancelled";
    ride.cancellationReason = reason || "Driver cancelled the ride.";
    await ride.save();

    // Notify all confirmed/pending passengers
    const io = req.app.get("io");
    io.emit("ride_cancelled", {
      rideId: ride._id,
      message: `The ride from ${ride.origin.city} to ${ride.destination.city} has been cancelled by the driver.`,
    });

    res.status(200).json({
      success: true,
      message: "Ride cancelled successfully",
    });
  } catch (error) {
    next({ statusCode: 500, message: "Failed to cancel ride" });
  }
};
