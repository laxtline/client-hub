/** Tailwind config — scans all source files and adds the ClientHub brand colors. */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  // Enable class-based dark mode: toggling the `dark` class on <html> flips theme.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: { navy: '#1F355E', blue: '#2B6CB0', light: '#E8F0FB', green: '#16A34A' },
      },
    },
  },
  plugins: [],
};
