<<<<<<< HEAD
=======
/** @type {import('tailwindcss').Config} */
>>>>>>> 79d324d3f41813facfd92db59e17056b73c678e1
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
<<<<<<< HEAD
    extend: {
      colors: {
        noir: '#0D0D0D',
        ivory: '#F5F5F0',
        gold: {
          DEFAULT: '#C6A75E',
          light: '#D4BA7A',
          dark: '#A88B3D',
          muted: 'rgba(198, 167, 94, 0.15)',
        },
        muted: '#1A1A1A',
        subtle: '#2A2A2A',
        blush: '#D4A0A0',
        emerald: '#2D5A4A',
        champagne: '#E8D5B7',
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      letterSpacing: {
        'luxury': '0.2em',
        'editorial': '0.15em',
      },
      boxShadow: {
        'glow-gold': '0 0 30px rgba(198, 167, 94, 0.15)',
        'editorial': '0 25px 60px -15px rgba(0, 0, 0, 0.5)',
        'card': '0 4px 30px rgba(0, 0, 0, 0.3)',
        'soft': '0 10px 40px -10px rgba(0,0,0,0.4)',
      },
      animation: {
        'fade-in': 'fadeIn 0.8s ease-out forwards',
        'fade-up': 'fadeUp 1s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up': 'slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'shimmer': 'shimmer 2.5s ease-in-out infinite',
        'parallax': 'parallax 20s linear infinite',
        'glow': 'glow 3s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(40px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
        parallax: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(-20px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(198, 167, 94, 0.1)' },
          '100%': { boxShadow: '0 0 40px rgba(198, 167, 94, 0.25)' },
        },
      },
    },
=======
    extend: {},
>>>>>>> 79d324d3f41813facfd92db59e17056b73c678e1
  },
  plugins: [],
}
