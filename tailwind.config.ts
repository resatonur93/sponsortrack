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
          /** Primary — UK sponsor navy */
          navy: "#0A2A5E",
          /** Secondary — institutional gold */
          gold: "#D4AF87",
          /** Alias: focus rings & links (formerly royal blue — now gold) */
          royal: "#D4AF87",
          surface: "#F8F9FA",
          teal: "#0D9488",
          slate: "#5C6570",
          amber: "#B8860B",
          emerald: "#059669",
          rose: "#C41E3A",
        },
        primary: {
          DEFAULT: "#0A2A5E",
          foreground: "#FFFFFF",
        },
        success: "#059669",
        warning: "#B8860B",
        danger: "#C41E3A",
        background: "#F8F9FA",
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
      boxShadow: {
        card: "0 4px 24px -4px rgba(10, 42, 94, 0.08), 0 2px 8px -4px rgba(10, 42, 94, 0.04)",
        "card-hover":
          "0 8px 32px -6px rgba(10, 42, 94, 0.12), 0 4px 12px -4px rgba(212, 175, 135, 0.15)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
