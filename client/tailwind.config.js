/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          900: '#1e3a8a',
        }
      }
    },
  },
  plugins: [],
  safelist: [
    'translate-x-0',
    '-translate-x-full',
    'md:translate-x-0',
    'md:ml-14',
    'lg:ml-56',
    'md:w-14',
    'md:hidden',
    'md:justify-center',
    'lg:justify-start',
    'md:px-2',
    'lg:px-3',
    'md:inline',
    'lg:inline',
    'lg:block',
    'lg:w-56',
  ],
}
