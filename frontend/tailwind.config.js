/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,jsx}'
  ],
  theme: {
    extend: {
      colors: {
        'neo-bg': '#FAF7F2',
        'neo-card': '#FFFFFF',
        'neo-border': '#000000',
        'neo-yellow': '#FEF08A',
        'neo-mint': '#A7F3D0',
        'neo-pink': '#FBCFE8',
        'neo-cyan': '#BAE6FD',
        'neo-purple': '#DDD6FE',
        'neo-orange': '#FED7AA',
        'neo-red': '#FECACA',

        // Mantener compatibilidad con clases de superficie
        'surface': '#FAF7F2',
        'surface-container': '#FFFFFF',
        'on-surface': '#000000',
        'primary': '#A7F3D0',
        'secondary': '#BAE6FD',
        'tertiary': '#FEF08A',
        'error': '#FECACA',
      },
      boxShadow: {
        'neo-sm': '2px 2px 0px 0px #000000',
        'neo': '4px 4px 0px 0px #000000',
        'neo-lg': '6px 6px 0px 0px #000000',
        'neo-xl': '8px 8px 0px 0px #000000',
      },
      borderWidth: {
        '3': '3px',
      },
      fontFamily: {
        'sans': ['Inter', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
    }
  },
  plugins: []
};
