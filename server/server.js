// ========== server/server.js (CRASH FIX: Removed PathError Line) ==========
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const socketio = require("socket.io");

// Import routes and middleware
const authRoutes = require("./routes/authRoutes");
const rideRoutes = require("./routes/rideRoutes");
const userRoutes = require("./routes/userRoutes");
const { errorHandler } = require("./middleware/errorHandler");

dotenv.config({ path: "../.env" }); // Load .env from parent directory

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

// Middleware (CRITICAL FIX: Increase body limit to 50mb)
// NOTE: app.use(cors({..})) already handles OPTIONS/pre-flight automatically.
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);

// We remove the problematic line here: // app.options('*', cors());

app.use(express.json({ limit: "50mb" })); // Increased limit
app.use(express.urlencoded({ extended: true, limit: "50mb" })); // Increased limit

// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// Socket.io Connection & State Management
const activeUsers = new Map();

io.on("connection", (socket) => {
  console.log("👤 User connected:", socket.id);

  socket.on("user_online", (userId) => {
    activeUsers.set(userId, socket.id);
    console.log(`User ${userId} is online. Active users: ${activeUsers.size}`);
  });

  socket.on("disconnect", () => {
    for (let [userId, socketId] of activeUsers.entries()) {
      if (socketId === socket.id) {
        activeUsers.delete(userId);
        console.log(
          `User ${userId} disconnected. Active users: ${activeUsers.size}`
        );
        break;
      }
    }
  });
});

// Make io and activeUsers accessible to routes
app.set("io", io);
app.set("activeUsers", activeUsers);

// Routes (Must be after middleware and server setup)
app.use("/api/auth", authRoutes);
app.use("/api/rides", rideRoutes);
app.use("/api/users", userRoutes);

// Health Check
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "Server is running" });
});

// Error Handler (must be the last middleware)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
});
