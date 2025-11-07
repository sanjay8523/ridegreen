// ========== client/src/App.jsx (FINAL CLEANED WORKING VERSION) ==========
import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
} from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Link,
  useNavigate,
} from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import { io } from "socket.io-client";
import {
  Car,
  Search,
  User,
  LogOut,
  Menu,
  X,
  MapPin,
  Users,
  DollarSign,
  Star,
  Leaf,
  Plus,
  Clock,
  ArrowRight,
  CheckCircle,
  XCircle,
  Filter,
  Phone,
  Mail,
} from "lucide-react";
import { format } from "date-fns";

// ⚠️ IMPORTANT: UPDATE THESE URLS AFTER YOU DEPLOY YOUR BACKEND TO RENDER
// For local testing:
// const API_URL = 'http://localhost:5000/api';
// const SOCKET_URL = 'http://localhost:5000';

// For Render Deployment:
const API_URL = "https://your-backend-url.onrender.com/api";
const SOCKET_URL = "https://your-backend-url.onrender.com";

// -----------------------------------------------------------
// CONTEXTS (Authentication and Socket)
// -----------------------------------------------------------

const AuthContext = createContext();
const SocketContext = createContext();

const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ["websocket", "polling"],
});

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    socket.disconnect();
    toast.success("Logged out successfully");
  }, []);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setUser(data.user);
        socket.emit("user_online", data.user._id);
      } else {
        logout();
      }
    } catch (error) {
      console.error("Fetch user error:", error);
    } finally {
      setLoading(false);
    }
  }, [token, logout]);

  useEffect(() => {
    if (token) {
      fetchCurrentUser();
      socket.connect();
    } else {
      setLoading(false);
    }

    socket.on("booking_update", (data) => {
      toast.custom(
        (t) => (
          <div
            className={`${
              t.visible ? "animate-enter" : "animate-leave"
            } bg-white border border-gray-200 p-4 rounded-xl shadow-lg flex items-center gap-3`}
          >
            {data.status === "confirmed" ? (
              <CheckCircle className="h-6 w-6 text-emerald-500" />
            ) : (
              <XCircle className="h-6 w-6 text-red-500" />
            )}
            <div>
              <p className="font-semibold text-gray-900">Booking Update</p>
              <p className="text-sm text-gray-600">{data.message}</p>
            </div>
          </div>
        ),
        { duration: 5000 }
      );
      fetchCurrentUser();
    });

    socket.on("booking_request", (data) => {
      toast.custom(
        (t) => (
          <div
            className={`${
              t.visible ? "animate-enter" : "animate-leave"
            } bg-white border border-emerald-500 p-4 rounded-xl shadow-lg flex items-center gap-3`}
          >
            <Users className="h-6 w-6 text-emerald-500" />
            <div>
              <p className="font-bold text-gray-900">New Ride Request!</p>
              <p className="text-sm text-gray-600">
                {data.passengerName} requested {data.seatsBooked} seat(s).
              </p>
              <Link to="/dashboard" className="text-xs text-blue-500 underline">
                View Dashboard
              </Link>
            </div>
          </div>
        ),
        { duration: 10000 }
      );
    });

    socket.on("ride_cancelled", (data) => {
      toast.error(data.message, { duration: 8000 });
      fetchCurrentUser();
    });

    return () => {
      socket.off("booking_update");
      socket.off("booking_request");
      socket.off("ride_cancelled");
    };
  }, [token, fetchCurrentUser]);

  const login = async (email, password) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (data.success) {
        localStorage.setItem("token", data.token);
        setToken(data.token);
        setUser(data.user);
        socket.connect();
        socket.emit("user_online", data.user._id);
        toast.success("Login successful! Welcome to RideGreen.");
        return true;
      } else {
        toast.error(data.message);
        return false;
      }
    } catch (error) {
      toast.error("Login failed. Check server status.");
      return false;
    }
  };

  const register = async (userData) => {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });
      const data = await response.json();

      if (data.success) {
        localStorage.setItem("token", data.token);
        setToken(data.token);
        setUser(data.user);
        socket.connect();
        socket.emit("user_online", data.user._id);
        toast.success("Registration successful! Start your green commute.");
        return true;
      } else {
        // Assuming the error message is in data.error or data.message from the server
        toast.error(
          data.error ||
            data.message ||
            "Registration failed due to server issue."
        );
        return false;
      }
    } catch (error) {
      toast.error("Registration failed.");
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        register,
        logout,
        loading,
        fetchCurrentUser,
      }}
    >
      <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
    </AuthContext.Provider>
  );
};

const useAuth = () => useContext(AuthContext);
// const useSocket = () => useContext(SocketContext); // Note: unused currently

// -----------------------------------------------------------
// COMPONENTS
// -----------------------------------------------------------

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-500"></div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" />;
};

// Navbar Component
const Navbar = () => {
  const { user, logout } = useAuth();
  const [mobileMenu, setMobileMenu] = useState(false);

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <div className="bg-emerald-500 p-2 rounded-lg">
              <Car className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">
              Ride<span className="text-emerald-500">Green</span>
            </span>
          </Link>

          {user ? (
            <div className="hidden md:flex items-center space-x-6">
              <Link
                to="/dashboard"
                className="text-gray-700 hover:text-emerald-500 font-medium transition-colors"
              >
                Dashboard
              </Link>
              <Link
                to="/search"
                className="text-gray-700 hover:text-emerald-500 font-medium transition-colors"
              >
                Find Rides
              </Link>
              <Link
                to="/create-ride"
                className="bg-emerald-500 text-white px-4 py-2 rounded-lg hover:bg-emerald-600 transition-colors font-medium"
              >
                Post Ride
              </Link>
              <Link to="/profile" className="flex items-center space-x-2">
                <img
                  src={user.avatar}
                  alt={user.fullName}
                  className="h-9 w-9 rounded-full border-2 border-emerald-500"
                />
              </Link>
              <button
                onClick={logout}
                className="text-red-500 hover:text-red-700 transition-colors"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <div className="hidden md:flex items-center space-x-4">
              <Link
                to="/login"
                className="text-gray-700 hover:text-emerald-500 font-medium transition-colors"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="bg-emerald-500 text-white px-6 py-2 rounded-lg hover:bg-emerald-600 transition-colors font-medium"
              >
                Sign Up
              </Link>
            </div>
          )}

          <button
            onClick={() => setMobileMenu(!mobileMenu)}
            className="md:hidden"
          >
            {mobileMenu ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {mobileMenu && (
        <div className="md:hidden bg-white border-t shadow-lg">
          {user ? (
            <div className="px-4 py-3 space-y-3">
              <Link
                to="/dashboard"
                className="block text-gray-700 py-2 hover:text-emerald-500"
              >
                Dashboard
              </Link>
              <Link
                to="/search"
                className="block text-gray-700 py-2 hover:text-emerald-500"
              >
                Find Rides
              </Link>
              <Link
                to="/create-ride"
                className="block text-gray-700 py-2 hover:text-emerald-500"
              >
                Post Ride
              </Link>
              <Link
                to="/profile"
                className="block text-gray-700 py-2 hover:text-emerald-500"
              >
                Profile
              </Link>
              <button
                onClick={logout}
                className="block w-full text-left text-red-500 py-2"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="px-4 py-3 space-y-3">
              <Link to="/login" className="block text-gray-700 py-2">
                Login
              </Link>
              <Link to="/register" className="block text-emerald-500 py-2">
                Sign Up
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

// Home Page
const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      <div className="max-w-7xl mx-auto px-4 py-12 md:py-20">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Travel Smart, Save Money,
            <br />
            <span className="text-emerald-500">Go Green</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Join thousands of commuters sharing rides, reducing costs, and
            making a positive impact on the environment.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            {user ? (
              <>
                <button
                  onClick={() => navigate("/search")}
                  className="bg-emerald-500 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-emerald-600 transition-all transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
                >
                  <Search className="h-5 w-5" />
                  Find a Ride
                </button>
                <button
                  onClick={() => navigate("/create-ride")}
                  className="bg-white text-emerald-500 border-2 border-emerald-500 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-emerald-50 transition-all transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
                >
                  <Plus className="h-5 w-5" />
                  Offer a Ride
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate("/register")}
                  className="bg-emerald-500 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-emerald-600 transition-all transform hover:scale-105 shadow-lg"
                >
                  Get Started
                </button>
                <button
                  onClick={() => navigate("/login")}
                  className="bg-white text-emerald-500 border-2 border-emerald-500 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-emerald-50 transition-all transform hover:scale-105 shadow-lg"
                >
                  Login
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {[
            {
              icon: DollarSign,
              title: "Save Money",
              description:
                "Share travel costs and save up to 60% on your daily commute expenses.",
              color: "emerald",
            },
            {
              icon: Leaf,
              title: "Reduce Emissions",
              description:
                "Every shared ride reduces carbon footprint and helps protect our planet.",
              color: "green",
            },
            {
              icon: Users,
              title: "Build Community",
              description:
                "Meet new people and build lasting connections while traveling together.",
              color: "blue",
            },
          ].map((feature, idx) => (
            <div
              key={idx}
              className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow"
            >
              <div
                className={`bg-${feature.color}-100 w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4`}
              >
                <feature.icon className={`h-7 w-7 text-${feature.color}-500`} />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">
                {feature.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Login Page
const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill all fields");
      return;
    }
    setLoading(true);
    const success = await login(email, password);
    if (success) {
      navigate("/dashboard");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center px-4 py-12">
      <div className="bg-white p-8 md:p-10 rounded-3xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <div className="bg-emerald-500 p-3 rounded-2xl inline-block mb-4">
            <Car className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Welcome Back</h2>
          <p className="text-gray-600 mt-2">Login to your RideGreen account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              placeholder="your@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 text-white py-3 rounded-xl font-semibold hover:bg-emerald-600 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="text-center mt-6 text-gray-600">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="text-emerald-500 font-semibold hover:text-emerald-600"
          >
            Sign Up
          </Link>
        </p>
        <p className="text-center mt-3">
          <Link
            to="/forgot-password"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Forgot Password?
          </Link>
        </p>
      </div>
    </div>
  );
};

// Register Page
const Register = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    const success = await register({
      fullName: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      password: formData.password,
    });
    if (success) {
      navigate("/dashboard");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center px-4 py-12">
      <div className="bg-white p-8 md:p-10 rounded-3xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <div className="bg-emerald-500 p-3 rounded-2xl inline-block mb-4">
            <Car className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Join RideGreen</h2>
          <p className="text-gray-600 mt-2">
            Create your account and start saving
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Full Name
            </label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="John Doe"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="your@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Phone Number (10 digits)
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="1234567890"
              pattern="[0-9]{10}"
              maxLength="10"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Password (Min 6 chars)
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="••••••••"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 text-white py-3 rounded-xl font-semibold hover:bg-emerald-600 transition-all disabled:bg-gray-400 shadow-lg"
          >
            {loading ? "Creating Account..." : "Sign Up"}
          </button>
        </form>

        <p className="text-center mt-6 text-gray-600">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-emerald-500 font-semibold hover:text-emerald-600"
          >
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

// Dashboard
const Dashboard = () => {
  const { user, token, fetchCurrentUser } = useAuth();
  const navigate = useNavigate();
  const [myRides, setMyRides] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [loadingRides, setLoadingRides] = useState(true);

  const fetchRides = useCallback(async () => {
    setLoadingRides(true);
    if (!token || !user) return; // Prevent fetching if not logged in

    try {
      const [ridesRes, bookingsRes] = await Promise.all([
        fetch(`${API_URL}/rides/my-rides`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/rides/my-bookings`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const ridesData = await ridesRes.json();
      const bookingsData = await bookingsRes.json();

      if (ridesData.success) {
        setMyRides(ridesData.rides);
      } else {
        toast.error("Failed to fetch posted rides.");
      }

      if (bookingsData.success) {
        // Filter out bookings where the user is the driver (already in myRides)
        const filteredBookings = bookingsData.rides.filter(
          (ride) => ride.driver._id !== user._id
        );
        setMyBookings(filteredBookings);
      } else {
        toast.error("Failed to fetch user bookings.");
      }
    } catch (error) {
      toast.error("Error fetching ride data.");
    } finally {
      setLoadingRides(false);
    }
  }, [token, user]);

  useEffect(() => {
    fetchRides();
  }, [fetchRides]); // Fixed React Hook dependency warning

  const updateBooking = async (rideId, passengerId, status) => {
    try {
      const response = await fetch(`${API_URL}/rides/booking/${rideId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ passengerId, status }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Booking ${status} successfully.`);
        fetchRides();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("Failed to update booking.");
    }
  };

  const RiderBookingCard = ({
    passenger,
    rideId,
    originCity,
    destinationCity,
  }) => (
    <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border-l-4 border-emerald-500 shadow-sm">
      <div className="flex items-center gap-3">
        <img
          src={passenger.user.avatar}
          alt={passenger.user.fullName}
          className="h-10 w-10 rounded-full"
        />
        <div>
          <p className="font-semibold text-gray-900">
            {passenger.user.fullName}
          </p>
          <p className="text-sm text-gray-600">
            Request for {passenger.seatsBooked} seat(s)
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => updateBooking(rideId, passenger.user._id, "confirmed")}
          className="bg-emerald-500 text-white p-2 rounded-full hover:bg-emerald-600 transition-colors"
          title="Confirm"
        >
          <CheckCircle className="h-5 w-5" />
        </button>
        <button
          onClick={() => updateBooking(rideId, passenger.user._id, "rejected")}
          className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
          title="Reject"
        >
          <XCircle className="h-5 w-5" />
        </button>
      </div>
    </div>
  );

  const DriverRideCard = ({ ride }) => {
    const pendingRequests = ride.passengers.filter(
      (p) => p.status === "pending"
    );
    const confirmedPassengers = ride.passengers.filter(
      (p) => p.status === "confirmed"
    );

    const [isExpanded, setIsExpanded] = useState(false);

    return (
      <div className="bg-white p-5 rounded-xl shadow-md border-l-4 border-blue-500">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-semibold text-gray-500">
              {format(new Date(ride.departureTime), "EEE, MMM do, p")}
            </p>
            <h3 className="text-xl font-bold text-gray-900 mt-1">
              {ride.origin.city} <ArrowRight className="inline h-4 w-4 mx-1" />{" "}
              {ride.destination.city}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Seats: {ride.getRemainingSeats} / {ride.availableSeats} available
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-emerald-600">
              ₹{ride.pricePerSeat}
            </p>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-blue-500 text-sm hover:underline mt-2"
            >
              {isExpanded ? "Hide Details" : "View Details"}
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
            {pendingRequests.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-bold text-lg text-red-500">
                  Pending Requests ({pendingRequests.length})
                </h4>
                {pendingRequests.map((p) => (
                  <RiderBookingCard
                    key={p.user._id}
                    passenger={p}
                    rideId={ride._id}
                    originCity={ride.origin.city}
                    destinationCity={ride.destination.city}
                  />
                ))}
              </div>
            )}

            {confirmedPassengers.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-bold text-lg text-emerald-500">
                  Confirmed Passengers ({confirmedPassengers.length})
                </h4>
                {confirmedPassengers.map((p) => (
                  <div
                    key={p.user._id}
                    className="flex items-center gap-3 bg-emerald-50 p-3 rounded-lg"
                  >
                    <img
                      src={p.user.avatar}
                      alt={p.user.fullName}
                      className="h-8 w-8 rounded-full"
                    />
                    <p className="text-sm text-gray-700">
                      {p.user.fullName} ({p.seatsBooked} seats) -{" "}
                      <span className="text-xs text-blue-600">
                        Contact: {p.user.phone}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            )}

            {pendingRequests.length === 0 &&
              confirmedPassengers.length === 0 && (
                <p className="text-gray-500 text-sm">
                  No bookings yet. Share your ride to find passengers!
                </p>
              )}
          </div>
        )}
      </div>
    );
  };

  const PassengerBookingCard = ({ ride }) => {
    const myBooking = ride.passengers.find((p) => p.user._id === user._id);
    const statusColor =
      {
        pending: "text-yellow-500 border-yellow-500",
        confirmed: "text-emerald-500 border-emerald-500",
        cancelled: "text-red-500 border-red-500",
        completed: "text-gray-500 border-gray-500",
      }[myBooking.status] || "text-gray-500 border-gray-500";

    return (
      <div className="bg-white p-5 rounded-xl shadow-md border-l-4 border-emerald-500">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-semibold text-gray-500">
              {format(new Date(ride.departureTime), "EEE, MMM do, p")}
            </p>
            <h3 className="text-xl font-bold text-gray-900 mt-1">
              {ride.origin.city} <ArrowRight className="inline h-4 w-4 mx-1" />{" "}
              {ride.destination.city}
            </h3>
            <div
              className={`mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-opacity-10 border ${statusColor}`}
            >
              <Clock className="h-3 w-3" />{" "}
              {myBooking.status.charAt(0).toUpperCase() +
                myBooking.status.slice(1)}
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">
              Driver: {ride.driver.fullName}
            </p>
            <div className="flex items-center justify-end gap-1 text-yellow-500">
              <Star className="h-4 w-4 fill-current" />
              <span className="text-sm font-semibold">
                {ride.driver.rating?.average?.toFixed(1) || "5.0"}
              </span>
            </div>
            {myBooking.status === "confirmed" && (
              <p className="text-sm text-blue-500 mt-2">
                Driver Phone: {ride.driver.phone}
              </p>
            )}
            {myBooking.status === "pending" && (
              <button
                disabled
                className="bg-gray-200 text-gray-700 px-3 py-1 rounded-lg text-sm mt-2"
              >
                Awaiting Confirmation
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.fullName}!
          </h1>
          <p className="text-gray-600 mt-2">Here's your ride summary</p>
        </div>

        {/* Stats Section */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {[
            {
              label: "Posted Rides",
              value: user?.ridesAsDriver || 0,
              icon: Car,
              color: "blue",
            },
            {
              label: "CO₂ Saved",
              value: `${user?.carbonSaved || 0} kg`,
              icon: Leaf,
              color: "green",
            },
            {
              label: "Money Saved",
              value: `₹${user?.moneySaved || 0}`,
              icon: DollarSign,
              color: "emerald",
            },
            {
              label: "Confirmed Bookings",
              value: user?.ridesAsPassenger || 0,
              icon: CheckCircle,
              color: "purple",
            },
          ].map((stat, idx) => (
            <div
              key={idx}
              className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">
                    {stat.label}
                  </p>
                  <p
                    className={`text-3xl font-bold text-${stat.color}-600 mt-1`}
                  >
                    {stat.value}
                  </p>
                </div>
                <stat.icon className={`h-10 w-10 text-${stat.color}-500`} />
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <button
              onClick={() => navigate("/search")}
              className="border-2 border-emerald-500 p-6 rounded-xl hover:bg-emerald-50 transition-colors text-left flex items-center gap-3"
            >
              <Search className="h-8 w-8 text-emerald-500 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-lg mb-1">Find a Ride</h3>
                <p className="text-gray-600 text-sm">
                  Search and book your next trip easily.
                </p>
              </div>
            </button>
            <button
              onClick={() => navigate("/create-ride")}
              className="border-2 border-blue-500 p-6 rounded-xl hover:bg-blue-50 transition-colors text-left flex items-center gap-3"
            >
              <Plus className="h-8 w-8 text-blue-500 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-lg mb-1">Post a Ride</h3>
                <p className="text-gray-600 text-sm">
                  Offer seats and share your travel cost.
                </p>
              </div>
            </button>
            <button
              onClick={() => navigate("/profile")}
              className="border-2 border-purple-500 p-6 rounded-xl hover:bg-purple-50 transition-colors text-left flex items-center gap-3"
            >
              <User className="h-8 w-8 text-purple-500 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-lg mb-1">Update Profile</h3>
                <p className="text-gray-600 text-sm">
                  Manage preferences and vehicle details.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Ride Status Section */}
        {loadingRides ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mx-auto"></div>
            <p className="text-gray-500 mt-4">Loading your active rides...</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* My Posted Rides (as Driver) */}
            <div>
              <h2 className="text-2xl font-bold mb-4 text-gray-900 border-b pb-2">
                My Posted Rides ({myRides.length})
              </h2>
              <div className="space-y-4">
                {myRides.length > 0 ? (
                  myRides.map((ride) => (
                    <DriverRideCard key={ride._id} ride={ride} />
                  ))
                ) : (
                  <div className="bg-white p-6 rounded-xl text-center text-gray-500 shadow-md">
                    <Car className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p>You haven't posted any active rides yet.</p>
                    <button
                      onClick={() => navigate("/create-ride")}
                      className="text-emerald-500 mt-2 hover:underline font-semibold"
                    >
                      Post Your First Ride
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* My Bookings (as Passenger) */}
            <div>
              <h2 className="text-2xl font-bold mb-4 text-gray-900 border-b pb-2">
                My Bookings ({myBookings.length})
              </h2>
              <div className="space-y-4">
                {myBookings.length > 0 ? (
                  myBookings.map((ride) => (
                    <PassengerBookingCard key={ride._id} ride={ride} />
                  ))
                ) : (
                  <div className="bg-white p-6 rounded-xl text-center text-gray-500 shadow-md">
                    <Search className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p>You haven't booked any rides yet.</p>
                    <button
                      onClick={() => navigate("/search")}
                      className="text-emerald-500 mt-2 hover:underline font-semibold"
                    >
                      Find a Ride Now
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Search Rides Page
const SearchRides = () => {
  const [searchData, setSearchData] = useState({
    originCity: "Mysuru",
    destinationCity: "Bengaluru",
    date: format(new Date(), "yyyy-MM-dd"),
    seats: 1,
  });
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(false);
  const { token, user } = useAuth();
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate(); // Added navigate here, though not strictly needed yet

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setRides([]);

    try {
      const queryParams = new URLSearchParams(searchData).toString();
      const response = await fetch(`${API_URL}/rides/search?${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (data.success) {
        setRides(data.rides);
        if (data.rides.length === 0) {
          toast.info("No rides found matching your criteria.");
        } else {
          toast.success(`${data.rides.length} rides found!`);
        }
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("Failed to search rides.");
    } finally {
      setLoading(false);
    }
  };

  const bookRide = async (rideId) => {
    try {
      const response = await fetch(`${API_URL}/rides/book`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rideId,
          seatsBooked: Number(searchData.seats),
          // Using city names as default points for now. Future feature: use maps for precise point selection
          pickupPoint: { address: searchData.originCity },
          dropPoint: { address: searchData.destinationCity },
        }),
      });
      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("Failed to book ride");
    }
  };

  const RideCard = ({ ride }) => {
    const isMyRide = ride.driver._id === user._id;

    return (
      <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow flex flex-col md:flex-row md:items-center justify-between">
        {/* Left Section: Driver and Route Info */}
        <div className="flex items-start gap-4 mb-4 md:mb-0 md:flex-1">
          <img
            src={ride.driver.avatar}
            alt={ride.driver.fullName}
            className="h-14 w-14 rounded-full border-2 border-emerald-500 flex-shrink-0"
          />
          <div className="flex-1">
            <h3 className="font-bold text-lg text-gray-900">
              {ride.driver.fullName}
            </h3>
            <div className="flex items-center gap-1 text-yellow-500 mb-2">
              <Star className="h-4 w-4 fill-current" />
              <span className="text-sm font-semibold">
                {ride.driver.rating?.average?.toFixed(1) || "5.0"}
              </span>
              {ride.driver.verified && (
                <CheckCircle
                  className="h-4 w-4 text-blue-500 ml-1"
                  title="Verified Driver"
                />
              )}
            </div>
            <div className="space-y-1 text-gray-600 text-sm">
              <div className="flex items-center gap-2 font-medium">
                <Clock className="h-4 w-4 text-blue-500" />
                <span>
                  {format(new Date(ride.departureTime), "EEE, MMM do, p")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-500" />
                <span>
                  {ride.origin.city} → {ride.destination.city} ({ride.distance}{" "}
                  km)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-500" />
                <span>{ride.getRemainingSeats} seats available</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section: Price and Action Button */}
        <div className="flex flex-col items-start md:items-end gap-3 md:w-40">
          <div className="text-left md:text-right">
            <p className="text-3xl font-bold text-emerald-600">
              ₹{ride.pricePerSeat}
            </p>
            <p className="text-sm text-gray-500">per seat</p>
          </div>
          {isMyRide ? (
            <button
              disabled
              className="w-full bg-gray-400 text-white px-6 py-2 rounded-lg font-semibold cursor-not-allowed"
            >
              Your Ride
            </button>
          ) : (
            <button
              onClick={() => bookRide(ride._id)}
              className="w-full bg-emerald-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-emerald-600 transition-colors disabled:bg-gray-400"
              disabled={ride.getRemainingSeats < searchData.seats}
            >
              {ride.getRemainingSeats < searchData.seats
                ? "Seats Full"
                : "Request to Join"}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-4">Find Your Green Commute</h1>

        {/* Search Form */}
        <form
          onSubmit={handleSearch}
          className="bg-white p-6 rounded-xl shadow-lg mb-6"
        >
          <div className="grid md:grid-cols-5 gap-4">
            <input
              type="text"
              placeholder="From (City e.g., Mysuru)"
              value={searchData.originCity}
              onChange={(e) =>
                setSearchData({ ...searchData, originCity: e.target.value })
              }
              className="col-span-2 px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              required
            />
            <input
              type="text"
              placeholder="To (City e.g., Bengaluru)"
              value={searchData.destinationCity}
              onChange={(e) =>
                setSearchData({
                  ...searchData,
                  destinationCity: e.target.value,
                })
              }
              className="col-span-2 px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-emerald-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-600 transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2"
            >
              {loading ? (
                "Searching..."
              ) : (
                <>
                  <Search className="h-5 w-5" /> Search
                </>
              )}
            </button>
          </div>
          <div className="mt-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <input
                type="date"
                value={searchData.date}
                onChange={(e) =>
                  setSearchData({ ...searchData, date: e.target.value })
                }
                className="px-4 py-2 border-2 border-gray-200 rounded-lg"
                required
              />
              <select
                value={searchData.seats}
                onChange={(e) =>
                  setSearchData({ ...searchData, seats: e.target.value })
                }
                className="px-4 py-2 border-2 border-gray-200 rounded-lg"
              >
                <option value="1">1 Seat</option>
                <option value="2">2 Seats</option>
                <option value="3">3 Seats</option>
                <option value="4">4 Seats</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="text-blue-500 flex items-center gap-2 hover:underline"
            >
              <Filter className="h-4 w-4" /> Advanced Filters
            </button>
          </div>
        </form>

        {/* Filters Section (Optional/Future) */}
        {showFilters && (
          <div className="bg-white p-6 rounded-xl shadow-md mb-6 border-t border-gray-100">
            <h3 className="font-semibold text-gray-700 mb-3">
              Filters (Future Feature)
            </h3>
            <div className="grid md:grid-cols-4 gap-4">
              {/* Placeholder for Max Price, Vehicle Type, Preferences */}
              <input
                type="number"
                placeholder="Max Price (₹)"
                className="px-4 py-3 border rounded-lg"
              />
              <select className="px-4 py-3 border rounded-lg">
                <option>Vehicle Type</option>
              </select>
              <select className="px-4 py-3 border rounded-lg">
                <option>Driver Preferences</option>
              </select>
            </div>
          </div>
        )}

        {/* Search Results */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mx-auto"></div>
              <p className="text-gray-500 mt-4">Searching for rides...</p>
            </div>
          ) : rides.length > 0 ? (
            rides.map((ride) => <RideCard key={ride._id} ride={ride} />)
          ) : (
            <div className="text-center py-12 bg-white rounded-xl shadow-md">
              <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                No active rides found for this route.
              </p>
              <button
                onClick={() => navigate("/create-ride")}
                className="text-blue-500 mt-2 hover:underline"
              >
                Be the first to post this ride!
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Create Ride Page
const CreateRide = () => {
  // Line 1462 (or similar line where the error occurs due to invisible character)
  const [formData, setFormData] = useState({
    originAddress: "",
    originCity: "Mysuru",
    destinationAddress: "",
    destinationCity: "Bengaluru",
    departureTime: "",
    availableSeats: 1,
    pricePerSeat: 100,
    vehicleType: "sedan",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const { token, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Set min date to prevent posting rides in the past
    const now = format(new Date(), "yyyy-MM-dd'T'HH:mm");
    const departureTimeInput = document.getElementById("departureTime");
    if (departureTimeInput) {
      departureTimeInput.min = now;
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (
      formData.originCity.toLowerCase() ===
      formData.destinationCity.toLowerCase()
    ) {
      toast.error("Origin and Destination must be different cities.");
      setLoading(false);
      return;
    }

    // Check if the user has vehicle details entered
    if (!user.vehicleDetails || !user.vehicleDetails.make) {
      toast.warn(
        "Please update your vehicle details in the profile section for more reliable ride matching."
      );
    }

    try {
      const response = await fetch(`${API_URL}/rides/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          origin: {
            address: formData.originAddress,
            city: formData.originCity,
          },
          destination: {
            address: formData.destinationAddress,
            city: formData.destinationCity,
          },
          departureTime: new Date(formData.departureTime),
          availableSeats: Number(formData.availableSeats),
          pricePerSeat: Number(formData.pricePerSeat),
          vehicleDetails: {
            type: formData.vehicleType,
            make: user.vehicleDetails?.make || "Car",
            model: user.vehicleDetails?.model || "Generic",
          },
          notes: formData.notes,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Ride posted successfully! Waiting for passengers.");
        navigate("/dashboard");
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("Failed to post ride.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">Offer a Ride</h1>

        <p className="text-gray-600 mb-6">
          Fill in your trip details to find matching passengers. Your ride
          contributes to **{user?.carbonSaved || 0} kg** of CO₂ savings!
        </p>
        <form
          onSubmit={handleSubmit}
          className="bg-white p-8 rounded-xl shadow-lg space-y-6"
        >
          <h2 className="text-xl font-semibold text-emerald-600 border-b pb-2">
            Route Details
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                From City
              </label>
              <input
                type="text"
                value={formData.originCity}
                onChange={(e) =>
                  setFormData({ ...formData, originCity: e.target.value })
                }
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="e.g., Mysuru"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                To City
              </label>
              <input
                type="text"
                value={formData.destinationCity}
                onChange={(e) =>
                  setFormData({ ...formData, destinationCity: e.target.value })
                }
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="e.g., Bengaluru"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Detailed Starting Address/Landmark
            </label>
            <input
              type="text"
              value={formData.originAddress}
              onChange={(e) =>
                setFormData({ ...formData, originAddress: e.target.value })
              }
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="E.g., NIE Main Gate"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Detailed Destination Address/Landmark
            </label>
            <input
              type="text"
              value={formData.destinationAddress}
              onChange={(e) =>
                setFormData({ ...formData, destinationAddress: e.target.value })
              }
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="E.g., Electronic City Phase 1"
              required
            />
          </div>

          <h2 className="text-xl font-semibold text-emerald-600 border-b pb-2 pt-4">
            Timing & Pricing
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Departure Date & Time
              </label>
              <input
                id="departureTime"
                type="datetime-local"
                value={formData.departureTime}
                onChange={(e) =>
                  setFormData({ ...formData, departureTime: e.target.value })
                }
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Available Seats (Excluding Driver)
              </label>
              <input
                type="number"
                min="1"
                max="7"
                value={formData.availableSeats}
                onChange={(e) =>
                  setFormData({ ...formData, availableSeats: e.target.value })
                }
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Price per Seat (₹)
              </label>
              <input
                type="number"
                min="10"
                value={formData.pricePerSeat}
                onChange={(e) =>
                  setFormData({ ...formData, pricePerSeat: e.target.value })
                }
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="100"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Vehicle Type
              </label>
              <select
                value={formData.vehicleType}
                onChange={(e) =>
                  setFormData({ ...formData, vehicleType: e.target.value })
                }
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="sedan">Sedan</option>
                <option value="suv">SUV</option>
                <option value="hatchback">Hatchback</option>
                <option value="van">Van/MUV</option>
                <option value="bike">Bike (2-seater total)</option>
              </select>
            </div>
          </div>

          <h2 className="text-xl font-semibold text-emerald-600 border-b pb-2 pt-4">
            Notes & Preferences
          </h2>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Additional Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              rows="3"
              placeholder="E.g., Luggage limitations, preferred music, trust building information."
            ></textarea>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 text-white py-4 rounded-xl font-semibold hover:bg-emerald-600 transition-colors disabled:bg-gray-400 shadow-lg"
          >
            {loading ? "Posting Ride..." : "Post Ride and Go Green"}
          </button>
        </form>
      </div>
    </div>
  );
};

// Profile Page
const Profile = () => {
  const { user, logout, token, fetchCurrentUser } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    bio: user?.bio || "",
    gender: user?.gender || "",
    phone: user?.phone || "",
    make: user?.vehicleDetails?.make || "",
    model: user?.vehicleDetails?.model || "",
    licensePlate: user?.vehicleDetails?.licensePlate || "",
  });

  const handleEditChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/users/update-profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bio: formData.bio,
          gender: formData.gender,
          phone: formData.phone,
          vehicleDetails: {
            make: formData.make,
            model: formData.model,
            licensePlate: formData.licensePlate,
          },
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Profile updated successfully!");
        fetchCurrentUser(); // Refresh user data globally
        setIsEditing(false);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("Failed to save profile.");
    } finally {
      setLoading(false);
    }
  };

  const ProfileDetails = () => (
    <div className="space-y-6">
           {" "}
      <h3 className="text-xl font-bold text-gray-800 border-b pb-2">
                Personal Information      {" "}
      </h3>
           {" "}
      <div className="grid md:grid-cols-2 gap-4 text-gray-700">
               {" "}
        <p>
                    <span className="font-semibold">Email:</span> {user?.email} 
               {" "}
        </p>
               {" "}
        <p>
                    <span className="font-semibold">Phone:</span>{" "}
          {user?.phone || "N/A"}       {" "}
        </p>
               {" "}
        <p>
                    <span className="font-semibold">Gender:</span>{" "}
          {user?.gender || "N/A"}       {" "}
        </p>
               {" "}
        <p>
                    <span className="font-semibold">Bio:</span>          {" "}
          {user?.bio || "No bio provided."}       {" "}
        </p>
             {" "}
      </div>
           {" "}
      <h3 className="text-xl font-bold text-gray-800 border-b pb-2 pt-4">
                Vehicle Details      {" "}
      </h3>
           {" "}
      <div className="grid md:grid-cols-2 gap-4 text-gray-700">
               {" "}
        <p>
                    <span className="font-semibold">Make:</span>          {" "}
          {user?.vehicleDetails?.make || "N/A"}       {" "}
        </p>
               {" "}
        <p>
                    <span className="font-semibold">Model:</span>          {" "}
          {user?.vehicleDetails?.model || "N/A"}       {" "}
        </p>
               {" "}
        <p>
                    <span className="font-semibold">License Plate:</span>      
              {user?.vehicleDetails?.licensePlate || "N/A"}       {" "}
        </p>
             {" "}
      </div>
         {" "}
    </div>
  );

  const EditProfileForm = () => (
    <form onSubmit={handleSaveProfile} className="space-y-6">
           {" "}
      <h3 className="text-xl font-bold text-gray-800 border-b pb-2">
                Edit Details      {" "}
      </h3>
           {" "}
      <div className="grid md:grid-cols-2 gap-4">
               {" "}
        <input
          name="phone"
          type="tel"
          placeholder="Phone Number"
          value={formData.phone}
          onChange={handleEditChange}
          className="p-3 border rounded-lg"
          required
        />
               {" "}
        <select
          name="gender"
          value={formData.gender}
          onChange={handleEditChange}
          className="p-3 border rounded-lg"
        >
                    <option value="">Select Gender</option>         {" "}
          <option value="male">Male</option>         {" "}
          <option value="female">Female</option>         {" "}
          <option value="other">Other</option>       {" "}
        </select>
             {" "}
      </div>
           {" "}
      <textarea
        name="bio"
        placeholder="Short Bio (e.g., I love chatting, I commute to NIE daily)"
        value={formData.bio}
        onChange={handleEditChange}
        className="w-full p-3 border rounded-lg"
        rows="3"
      />
           {" "}
      <h3 className="text-xl font-bold text-gray-800 border-b pb-2 pt-4">
                Edit Vehicle      {" "}
      </h3>
           {" "}
      <div className="grid md:grid-cols-3 gap-4">
               {" "}
        <input
          name="make"
          placeholder="Vehicle Make (e.g., Maruti)"
          value={formData.make}
          onChange={handleEditChange}
          className="p-3 border rounded-lg"
        />
               {" "}
        <input
          name="model"
          placeholder="Vehicle Model (e.g., Swift)"
          value={formData.model}
          onChange={handleEditChange}
          className="p-3 border rounded-lg"
        />
               {" "}
        <input
          name="licensePlate"
          placeholder="License Plate (e.g., KA-01-AB-1234)"
          value={formData.licensePlate}
          onChange={handleEditChange}
          className="p-3 border rounded-lg"
        />
             {" "}
      </div>
           {" "}
      <div className="flex gap-4 pt-4">
               {" "}
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-emerald-500 text-white py-3 rounded-lg font-semibold hover:bg-emerald-600 transition-colors disabled:bg-gray-400"
        >
                    {loading ? "Saving..." : "Save Changes"}       {" "}
        </button>
               {" "}
        <button
          type="button"
          onClick={() => setIsEditing(false)}
          className="flex-1 border border-gray-400 text-gray-700 py-3 rounded-lg hover:bg-gray-100 transition-colors"
        >
                    Cancel        {" "}
        </button>
             {" "}
      </div>
         {" "}
    </form>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
           {" "}
      <div className="max-w-4xl mx-auto px-4">
               {" "}
        <div className="bg-white rounded-xl shadow-lg p-8">
                   {" "}
          <div className="flex flex-col md:flex-row gap-8 items-center md:items-start mb-8 pb-4 border-b">
                       {" "}
            <img
              src={user?.avatar}
              alt={user?.fullName}
              className="h-32 w-32 rounded-full border-4 border-emerald-500"
            />
                       {" "}
            <div className="flex-1 text-center md:text-left">
                           {" "}
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                {user?.fullName}             {" "}
              </h1>
                           {" "}
              <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
                               {" "}
                <div className="flex items-center gap-1 text-yellow-500">
                                    <Star className="h-5 w-5 fill-current" />   
                               {" "}
                  <span className="font-semibold">
                                       {" "}
                    {user?.rating?.average?.toFixed(1) || "5.0"}               
                     {" "}
                  </span>
                                 {" "}
                </div>
                               {" "}
                {user?.verified && (
                  <div className="flex items-center gap-1 text-blue-500">
                                        <CheckCircle className="h-5 w-5" />     
                                 {" "}
                    <span className="text-sm font-medium">Verified User</span> 
                                   {" "}
                  </div>
                )}
                             {" "}
              </div>
                         {" "}
            </div>
                       {" "}
            <div className="md:w-40 text-center md:text-right">
                           {" "}
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors font-semibold"
              >
                                {isEditing ? "Viewing" : "Edit Profile"}       
                     {" "}
              </button>
                         {" "}
            </div>
                     {" "}
          </div>
                    {isEditing ? <EditProfileForm /> : <ProfileDetails />}     
           {" "}
        </div>
               {" "}
        <div className="mt-8">
                   {" "}
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
                        Account Actions          {" "}
          </h2>
                   {" "}
          <div className="flex gap-4 bg-white p-6 rounded-xl shadow-md">
                       {" "}
            <button
              onClick={() => navigate("/dashboard")}
              className="flex-1 border-2 border-emerald-500 text-emerald-600 py-3 rounded-lg font-semibold hover:bg-emerald-50 transition-colors"
            >
                            View Ride History            {" "}
            </button>
                       {" "}
            <button
              onClick={logout}
              className="flex-1 bg-red-500 text-white py-3 rounded-lg font-semibold hover:bg-red-600 transition-colors"
            >
                            Logout            {" "}
            </button>
                     {" "}
          </div>
                 {" "}
        </div>
             {" "}
      </div>
         {" "}
    </div>
  );
};

// Forgot Password Placeholder
const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); // NOTE: This uses the /forgotpassword endpoint defined in authController.js
    try {
      const response = await fetch(`${API_URL}/auth/forgotpassword`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Password reset email sent! Check your inbox.");
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center px-4 py-12">
           {" "}
      <div className="bg-white p-8 md:p-10 rounded-3xl shadow-2xl w-full max-w-md">
               {" "}
        <div className="text-center mb-8">
                   {" "}
          <h2 className="text-3xl font-bold text-gray-900">Forgot Password</h2> 
                 {" "}
          <p className="text-gray-600 mt-2">
                        Enter your email to receive a password reset link.      
               {" "}
          </p>
                 {" "}
        </div>
               {" "}
        <form onSubmit={handleSubmit} className="space-y-6">
                   {" "}
          <div>
                       {" "}
            <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Email            {" "}
            </label>
                       {" "}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              placeholder="your@email.com"
              required
            />
                     {" "}
          </div>
                   {" "}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 text-white py-3 rounded-xl font-semibold hover:bg-emerald-600 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg"
          >
                        {loading ? "Sending..." : "Send Reset Link"}         {" "}
          </button>
                 {" "}
        </form>
               {" "}
        <p className="text-center mt-6">
                   {" "}
          <Link
            to="/login"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
                        Back to Login          {" "}
          </Link>
                 {" "}
        </p>
             {" "}
      </div>
         {" "}
    </div>
  );
};

// -----------------------------------------------------------
// MAIN APP COMPONENT
// -----------------------------------------------------------

function App() {
  return (
    <AuthProvider>
           {" "}
      <Router>
               {" "}
        <div className="min-h-screen bg-gray-50">
                   {" "}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "#fff",
                color: "#333",
                borderRadius: "12px",
                padding: "16px",
              },
              success: {
                iconTheme: {
                  primary: "#10b981",
                  secondary: "#fff",
                },
              },
            }}
          />
                    <Navbar />         {" "}
          <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                       {" "}
            <Route path="/forgot-password" element={<ForgotPassword />} />
                       {" "}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                                    <Dashboard />               {" "}
                </ProtectedRoute>
              }
            />
                       {" "}
            <Route
              path="/search"
              element={
                <ProtectedRoute>
                                    <SearchRides />               {" "}
                </ProtectedRoute>
              }
            />
                       {" "}
            <Route
              path="/create-ride"
              element={
                <ProtectedRoute>
                                    <CreateRide />               {" "}
                </ProtectedRoute>
              }
            />
                       {" "}
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                                    <Profile />               {" "}
                </ProtectedRoute>
              }
            />
                        <Route path="*" element={<Navigate to="/" />} />       
             {" "}
          </Routes>
                 {" "}
        </div>
             {" "}
      </Router>
         {" "}
    </AuthProvider>
  );
}

export default App;
