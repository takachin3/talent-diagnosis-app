/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // api/ はサーバー側コードなので Tailwind 対象外
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Hiragino Sans"', '"Hiragino Kaku Gothic ProN"', '"Noto Sans JP"', 'sans-serif'],
      },
      colors: {
        ink: '#1a2540',
        accent: '#3b5bdb',
      },
    },
  },
  plugins: [],
}
