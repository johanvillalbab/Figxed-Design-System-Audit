/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/ui/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        figma: {
          bg: 'var(--figma-color-bg)',
          'bg-secondary': 'var(--figma-color-bg-secondary)',
          'bg-tertiary': 'var(--figma-color-bg-tertiary)',
          'bg-hover': 'var(--figma-color-bg-hover)',
          'bg-selected': 'var(--figma-color-bg-selected)',
          text: 'var(--figma-color-text)',
          'text-secondary': 'var(--figma-color-text-secondary)',
          'text-tertiary': 'var(--figma-color-text-tertiary)',
          border: 'var(--figma-color-border)',
          icon: 'var(--figma-color-icon)',
          'icon-secondary': 'var(--figma-color-icon-secondary)',
          brand: 'var(--figma-color-bg-brand)',
          'brand-hover': 'var(--figma-color-bg-brand-hover)',
          success: 'var(--figma-color-bg-success)',
          warning: 'var(--figma-color-bg-warning)',
          danger: 'var(--figma-color-bg-danger)',
        },
      },
      fontSize: {
        '2xs': ['10px', '14px'],
        xs: ['11px', '16px'],
        sm: ['12px', '16px'],
        base: ['13px', '20px'],
        lg: ['14px', '20px'],
      },
    },
  },
  plugins: [],
};
