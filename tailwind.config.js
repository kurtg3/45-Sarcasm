/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",
    "./blog/*.html",
    "./assets/js/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        'brand-orange': '#ff6b35',
        'brand-teal': '#4ecdc4',
        'brand-yellow': '#f7b731',
        'brand-charcoal': '#1a1a1a',
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'display': ['Poppins', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
