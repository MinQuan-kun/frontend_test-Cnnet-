/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Đảm bảo có dòng này để nó quét hết file JSX
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}