/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#f3f6f4",
        panel: "#171a20",
        line: "#2a2f37",
        moss: "#9aa8a0",
        signal: "#62c3ad",
        caution: "#e5a45d",
        danger: "#ef6b6b",
        skyline: "#8ab4e6"
      },
      boxShadow: {
        soft: "0 12px 30px rgba(23, 32, 28, 0.08)"
      }
    },
  },
  plugins: [],
};
