import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        navy: {
          DEFAULT: "#0A1F5C",
          light: "#1A3A8F",
          dark: "#060F2E",
        },
        gold: {
          DEFAULT: "#D4A017",
        },
        surface: {
          DEFAULT: "#0D1117",
          raised: "#161B22",
          overlay: "#21262D",
        },
        border: "#30363D",
        foreground: "#E6EDF3",
        muted: "#8B949E",
        background: "#0D1117",
        primary: {
          DEFAULT: "#0A1F5C",
          foreground: "#E6EDF3",
        },
        accent: {
          DEFAULT: "#D4A017",
          foreground: "#0A1F5C",
        },
        destructive: {
          DEFAULT: "#DA3633",
          foreground: "#E6EDF3",
        },
        card: {
          DEFAULT: "#161B22",
          foreground: "#E6EDF3",
        },
        input: "#21262D",
        ring: "#D4A017",
      },
      borderRadius: {
        lg: "16px",
        md: "12px",
        sm: "10px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
