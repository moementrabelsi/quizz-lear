/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        lear: {
          red: '#d82a28',
          dark: '#1a1a1a',
          muted: '#6b7280',
          border: '#e5e7eb',
          surface: '#fafafa',
        },
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
