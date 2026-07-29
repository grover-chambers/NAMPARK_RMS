import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brown: {
          DEFAULT: "#5C4033",
          50: "#FAF5F2",
          100: "#F0E6DE",
          200: "#E0CCBC",
          300: "#C9A88E",
          400: "#A67B5B",
          500: "#8B6243",
          600: "#6D4C35",
          700: "#5C4033",
          800: "#4A3328",
          900: "#3A281F",
          950: "#2A1C15",
        },
        ivory: {
          DEFAULT: "#FFFFF0",
          50: "#FEFFF9",
          100: "#FDFFF3",
          200: "#FFFFF0",
          300: "#FFFDE8",
          400: "#FFFBD0",
          500: "#FFF8B0",
        },
        teal: {
          DEFAULT: "#008080",
          50: "#E6F5F5",
          100: "#B3E0E0",
          200: "#80CCCC",
          300: "#4DB8B8",
          400: "#1AA3A3",
          500: "#008080",
          600: "#006666",
          700: "#004D4D",
          800: "#003333",
          900: "#001A1A",
        },
      },
      borderRadius: {
        xl: "12px",
        "2xl": "16px",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
export default config;
