/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#F8FAFC',        // Slate-50 background
          surface: '#FFFFFF',   // White panels
          primary: '#10B981',   // Emerald Green primary
          secondary: '#475569', // Slate Gray secondary
          text: '#0F172A',      // Slate-900 text
          border: '#E2E8F0',    // Slate-200 border
        }
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        panel: '0 4px 6px -1px rgba(0, 0, 0, 0.03), 0 2px 4px -2px rgba(0, 0, 0, 0.03)',
      },
      borderRadius: {
        lg: '8px',
        md: '6px',
        sm: '4px',
      }
    },
  },
  plugins: [],
}
