import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#15130F",
          soft: "#1E1B16",
          line: "#2A2620",
        },
        paper: {
          DEFAULT: "#E7E4DA",
          dim: "#C9C5B8",
        },
        seal: {
          DEFAULT: "#E2402B",
          dim: "#A6301F",
        },
        ukiyo: {
          DEFAULT: "#3FA9A0",
          dim: "#2B7A73",
        },
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
      backgroundImage: {
        halftone:
          "radial-gradient(circle, rgba(231,228,218,0.16) 1px, transparent 1.4px)",
      },
      backgroundSize: {
        halftone: "10px 10px",
      },
    },
  },
  plugins: [],
};

export default config;
