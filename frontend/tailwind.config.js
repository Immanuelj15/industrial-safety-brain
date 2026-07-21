/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enables dark mode support
  theme: {
    extend: {
      colors: {
        // Industrial Safety Theme Colors
        safety: {
          red: '#ef4444',     // Danger / Emergency
          orange: '#f97316',  // Warning / Caution
          amber: '#fbbf24',   // Alert
          green: '#22c55e',   // Safe / Success
          blue: '#3b82f6',    // Information
        },
        industrial: {
          gray: {
            900: '#111827',
            800: '#1f2937',
            700: '#374151',
          },
          orange: '#ea580c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'safety': '0 10px 15px -3px rgb(239 68 68 / 0.3)',
      },
    },
  },
  plugins: [],
}