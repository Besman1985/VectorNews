import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0a1020",
        "ink-soft": "#121a2e",
        "ink-muted": "#1a2440",
        gold: "#d8b768",
        sand: "#f2deaa",
        mist: "#9ba9c6",
        line: "rgba(255,255,255,0.08)"
      },
      boxShadow: {
        glow: "0 10px 40px rgba(216, 183, 104, 0.18)"
      },
      backgroundImage: {
        "grid-fade":
          "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)"
      },
      animation: {
        reveal: "reveal 800ms ease-out both"
      },
      keyframes: {
        reveal: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      }
    }
  },
  darkMode: ["class"],
  plugins: []
};

export default config;
