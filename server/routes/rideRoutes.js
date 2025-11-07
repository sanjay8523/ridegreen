// ========== server/routes/rideRoutes.js ==========
const express = require("express");
const {
  createRide,
  searchRides,
  bookRide,
  updateBookingStatus,
  getMyRides,
  getMyBookings,
  cancelRide,
} = require("../controllers/rideController");
const { protect } = require("../middleware/auth");

const router = express.Router();

// All ride routes are protected (require login)
router.use(protect);

router.route("/create").post(createRide);
router.route("/search").get(searchRides);
router.route("/book").post(bookRide);
router.route("/my-rides").get(getMyRides);
router.route("/my-bookings").get(getMyBookings);
router.route("/booking/:id").put(updateBookingStatus); // :id is rideId
router.route("/cancel/:id").put(cancelRide); // :id is rideId

module.exports = router;
