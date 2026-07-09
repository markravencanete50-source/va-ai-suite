import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0F141A",        // base background — graphite ink
        panel: "#171E27",      // raised surfaces
        line: "#26303C",       // hairline borders
        fog: "#94A3B3",        // secondary text
        paper: "#E9EEF3",      // primary text
        pulse: "#7C8CF8",      // signature accent — periwinkle signal
        mint: "#4ADE9E",       // success / money
        amber: "#F5B14A",      // pending / warning
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
