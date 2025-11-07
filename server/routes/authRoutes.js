// ========== server/routes/authRoutes.js (FINAL CHECK) ==========
const express = require("express");
const {
  register,
  login,
  getMe,
  forgotPassword,
} = require("../controllers/authController");
const { protect } = require("../middleware/auth"); // Import as named export

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getMe);
router.post("/forgotpassword", forgotPassword);

module.exports = router;
