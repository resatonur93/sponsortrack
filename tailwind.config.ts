import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: "#0F2B5B",
          royal: "#1E5BB5",
          teal: "#0D9488",
          slate: "#64748B",
          amber: "#D97706",
          emerald: "#059669",
          rose: "#E11D48",
        },
        primary: {
          DEFAULT: "#0F2B5B",
          foreground: "#FFFFFF",
        },
        success: "#059669",
        warning: "#D97706",
        danger: "#E11D48",
        background: "#F8FAFC",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "draw-check": {
          to: { "stroke-dashoffset": "0" },
        },
      },
      animation: {
        "draw-check": "draw-check 0.5s ease-out forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
