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
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
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
        /** Semantic UI — WCAG AA friendly on white / on colored fills */
        success: {
          DEFAULT: "#047857",
          foreground: "#FFFFFF",
          muted: "#ECFDF5",
          border: "#6EE7B7",
        },
        warning: {
          DEFAULT: "#B45309",
          foreground: "#FFFFFF",
          muted: "#FFFBEB",
          border: "#FCD34D",
        },
        danger: {
          DEFAULT: "#B91C1C",
          foreground: "#FFFFFF",
          muted: "#FEF2F2",
          border: "#FECACA",
        },
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
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-in-left": {
          "0%": { opacity: "0", transform: "translateX(-8px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "draw-check": "draw-check 0.5s ease-out forwards",
        "fade-up": "fade-up 0.4s ease-out forwards",
        "fade-in": "fade-in 0.3s ease-out forwards",
        "slide-in-left": "slide-in-left 0.3s ease-out forwards",
        shimmer: "shimmer 2s linear infinite",
      },
      boxShadow: {
        card: "0 4px 24px -4px rgba(10, 42, 94, 0.08), 0 2px 8px -4px rgba(10, 42, 94, 0.04)",
        "card-hover":
          "0 8px 32px -6px rgba(10, 42, 94, 0.14), 0 4px 12px -4px rgba(212, 175, 135, 0.18)",
        "card-gold":
          "0 0 0 1px rgba(212, 175, 135, 0.4), 0 8px 24px -4px rgba(212, 175, 135, 0.2)",
        "sidebar":
          "4px 0 32px -8px rgba(10, 42, 94, 0.25)",
        "stat":
          "0 4px 20px -4px rgba(10, 42, 94, 0.10), inset 0 1px 0 rgba(255,255,255,0.8)",
        "stat-hover":
          "0 8px 28px -4px rgba(10, 42, 94, 0.16), inset 0 1px 0 rgba(255,255,255,0.9)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
