/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--bg)',
        'bg-secondary': 'var(--bg-secondary)',
        card: 'var(--card)',
        'text-primary': 'var(--text)',
        'text-secondary': 'var(--text-secondary)',
        primary: 'var(--primary)',
        'primary-hover': 'var(--primary-hover)',
        accent: 'var(--accent)',
        success: 'var(--success)',
        danger: 'var(--danger)',
        border: 'var(--border)',
      },
    },
  },
  plugins: [],
};
