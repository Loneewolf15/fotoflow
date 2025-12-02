/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        organic: {
          dark: '#1B1E22',       // Dark Mist Charcoal (Primary Background)
          mist: '#23272D',       // Misty Overlay 1
          'mist-light': '#2A2F36', // Misty Overlay 2
          green: '#4FB7A8',      // Soft Teal (Primary Accent)
          stone: '#9FA6AD',      // Warm Gray (Secondary Accent)
          text: '#D8E1E8',       // Light Mist Gray (Text)
        }
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        }
      }
    },
  },
  plugins: [],
};
