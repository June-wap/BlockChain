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
        brand: {
          50: "#eef7ff",
          100: "#d9ecff",
          200: "#bce0ff",
          300: "#8eccff",
          400: "#58b0fa",
          500: "#3192f4",
          600: "#1b74e6",
          700: "#145ecb",
          800: "#164ea3",
          900: "#174381",
          950: "#102a52",
        },
      },
    },
  },
  plugins: [],
};
export default config;
