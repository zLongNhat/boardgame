/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        table: {
          dark: '#0d2818',
          felt: '#165b33',
          border: '#04150c',
          wood: '#3e1f0c',
          gold: '#e0a96d'
        },
        uno: {
          red: '#ff5555',
          blue: '#00aaee',
          green: '#55aa55',
          yellow: '#ffaa00',
          dark: '#1e293b'
        }
      },
      fontFamily: {
        sans: ['"Be Vietnam Pro"', '"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', '"Be Vietnam Pro"', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-short': 'bounce 0.8s ease-in-out infinite'
      }
    },
  },
  plugins: [],
}
