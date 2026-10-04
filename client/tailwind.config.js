/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Mockup design system — exact UI rebuild (Oct 2026 mockups)
        canvas: '#F1F2F9', // page background (light lavender-gray)
        ink: '#1A1F36', // headings (dark navy)
        body: '#69708A', // body text (slate gray)
        muted: '#9AA1B9', // muted text/icons
        line: '#E7E9F4', // borders
        input: '#E2E5F1', // input borders
        primary: {
          DEFAULT: '#4F46E5', // vivid indigo (buttons, active pill)
          dark: '#4338CA',
          soft: '#EEEDFE', // soft indigo tint
        },
        navy: '#131A2C', // dark sidebar
        navysoft: '#1C2440', // sidebar hover
        // Stat icon colors (dashboard)
        statPurple: '#6D5DF7',
        statGreen: '#22C55E',
        statOrange: '#F59E0B',
        statBlue: '#3B82F6',
        // Kanban column tints
        colTodo: '#F1F0F7',
        colProg: '#FFF4E8',
        colDone: '#EAF7F0',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(26,31,54,.06)',
        pop: '0 12px 40px rgba(26,31,54,.14), 0 2px 8px rgba(26,31,54,.08)',
        lift: '0 2px 6px rgba(26,31,54,.08), 0 12px 28px rgba(26,31,54,.10)',
      },
    },
  },
  plugins: [],
};
