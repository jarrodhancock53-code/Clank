import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        dungeon: {
          950: "#0a0805",
          900: "#13100a",
          850: "#1a150e",
          800: "#221b12",
          700: "#332817",
          600: "#473420",
        },
        parchment: {
          100: "#f5ead0",
          200: "#ecdcb3",
          300: "#dcc890",
          400: "#c9ad6c",
        },
        gold: {
          300: "#f0d785",
          400: "#dcb24a",
          500: "#c79a35",
          600: "#a87d24",
          700: "#7d5c17",
        },
        blood: {
          400: "#e0584f",
          500: "#c2362c",
          600: "#9c2620",
        },
        clankblue: {
          400: "#5aa9d6",
          500: "#3a85b3",
        },
      },
      fontFamily: {
        display: ["Cinzel", "Georgia", "serif"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 18px rgba(220, 178, 74, 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
