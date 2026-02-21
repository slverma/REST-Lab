/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/webview/**/*.{tsx,ts,jsx,js}"],
  theme: {
    extend: {
      colors: {
        // REST Lab brand colors
        restlab: {
          accent: "#38bdf8",
          "accent-hover": "#0ea5e9",
        },
        // HTTP method colors
        method: {
          get: "#22c55e",
          post: "#3b82f6",
          put: "#f59e0b",
          patch: "#a855f7",
          delete: "#ef4444",
        },
      },
      backgroundImage: {
        "restlab-gradient": "linear-gradient(90deg, #38bdf8 0%, #6366f1 100%)",
        "restlab-gradient-hover":
          "linear-gradient(90deg, #0ea5e9 0%, #4f46e5 100%)",
      },
      boxShadow: {
        glow: "0 0 8px rgba(56, 189, 248, 0.4)",
        "glow-lg": "0 4px 16px rgba(56, 189, 248, 0.4)",
      },
      animation: {
        "fade-in": "fadeIn 0.15s ease-out",
        "slide-down": "slideDown 0.15s ease-out",
        shimmer: "shimmer 0.5s ease",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideDown: {
          from: { opacity: "0", transform: "translateY(-4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          from: { left: "-100%" },
          to: { left: "100%" },
        },
      },
    },
  },
  plugins: [],
};
