/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Mismo azul de marca usado en gestion-pdl (bg-brand)
        brand: {
          DEFAULT: '#0c3a73',
          dark: '#082850',
        },
      },
    },
  },
  plugins: [],
}
