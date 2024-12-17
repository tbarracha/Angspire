/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js,ts}"],
  darkMode: ['class', '[data-mode="dark"]'],
  theme: {
    extend: {
      colors: {
        // to create theme colors, run: node theme-sync update

        // Theme START
          'header': 'var(--header)',
          'header-contrast': 'var(--header-contrast)',
          'background': 'var(--background)',
          'background-contrast': 'var(--background-contrast)',
          'footer': 'var(--footer)',
          'footer-contrast': 'var(--footer-contrast)',
          'primary': 'var(--primary)',
          'primary-contrast': 'var(--primary-contrast)',
          'secondary': 'var(--secondary)',
          'secondary-contrast': 'var(--secondary-contrast)',
          'highlight': 'var(--highlight)',
          'highlight-contrast': 'var(--highlight-contrast)',
          'accent': 'var(--accent)',
          'accent-contrast': 'var(--accent-contrast)',
          'scrollbar-bg': 'var(--scrollbar-bg)',
          'scrollbar-thumb': 'var(--scrollbar-thumb)',
          'scrollbar-thumb-hover': 'var(--scrollbar-thumb-hover)',
          'success': 'var(--success)',
          'success-secondary': 'var(--success-secondary)',
          'info': 'var(--info)',
          'info-secondary': 'var(--info-secondary)',
          'warning': 'var(--warning)',
          'warning-secondary': 'var(--warning-secondary)',
          'danger': 'var(--danger)',
          'danger-secondary': 'var(--danger-secondary)',
        
    themes: {
      light: '[data-theme="light"]',
      dark: '[data-theme="dark"]',
      oak: '[data-theme="oak"]'
    },// Theme END
        },
      },
    },
  plugins: [],
}
