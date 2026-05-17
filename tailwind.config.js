/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17201c",
        panel: "#f7f8f5",
        line: "#dfe4dc",
        moss: "#526b5a",
        signal: "#2f7d6d",
        caution: "#a86f2c",
        danger: "#ad3e3e",
        skyline: "#375b7d"
      },
      boxShadow: {
        soft: "0 12px 30px rgba(23, 32, 28, 0.08)"
      }
    },
  },
  plugins: [],
};
