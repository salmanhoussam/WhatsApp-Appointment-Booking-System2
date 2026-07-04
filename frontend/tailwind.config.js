/** @type {import('tailwindcss').Config} */
import relumePlugin from "@relume_io/relume-tailwind";

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@relume_io/relume-ui/dist/**/*.{js,jsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [relumePlugin],
}