// ========== server/routes/userRoutes.js (FULL CODE) ==========
const express = require("express");
const { protect } = require("../middleware/auth");
const { updateProfile } = require("../controllers/userController"); // Import the controller

const router = express.Router();

// All routes here are protected
router.use(protect);

router.route("/update-profile").put(updateProfile);

module.exports = router;
