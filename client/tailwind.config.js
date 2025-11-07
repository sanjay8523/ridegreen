// ========== client/tailwind.config.js ==========
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        emerald: {
          50: "#ecfdf5",
          100: "#d1fae5",
          500: "#10b981",
          600: "#059669",
        },
        // Allowing tailwind to detect dynamic classes for button and icon colors
        // from the components (e.g., text-blue-500, bg-red-500)
        blue: { 500: "#3b82f6", 600: "#2563eb" },
        red: { 500: "#ef4444", 600: "#dc2626" },
        yellow: { 500: "#f59e0b", 600: "#d97706" },
        purple: { 500: "#a855f7", 600: "#9333ea" },
        green: { 500: "#22c55e", 600: "#16a34a" },
      },
    },
  },
  plugins: [],
};
