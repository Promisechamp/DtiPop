/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],

  theme: {
    extend: {
      colors: {
        primary: {
          50: "var(--color-primary-50)",
          100: "var(--color-primary-100)",
          200: "var(--color-primary-200)",
          300: "var(--color-primary-300)",
          400: "var(--color-primary-400)",
          500: "var(--color-primary-500)",
          600: "var(--color-primary-600)",
          700: "var(--color-primary-700)",
          800: "var(--color-primary-800)",
          900: "var(--color-primary-900)",
        },

        brand: {
          50: "var(--color-brand-50)",
          100: "var(--color-brand-100)",
          200: "var(--color-brand-200)",
          300: "var(--color-brand-300)",
          400: "var(--color-brand-400)",
          500: "var(--color-brand-500)",
          600: "var(--color-brand-600)",
          700: "var(--color-brand-700)",
          800: "var(--color-brand-800)",
          900: "var(--color-brand-900)",
        },

        ink: {
          50: "var(--color-ink-50)",
          100: "var(--color-ink-100)",
          200: "var(--color-ink-200)",
          300: "var(--color-ink-300)",
          400: "var(--color-ink-400)",
          500: "var(--color-ink-500)",
          600: "var(--color-ink-600)",
          700: "var(--color-ink-700)",
          800: "var(--color-ink-800)",
          900: "var(--color-ink-900)",
          950: "var(--color-ink-950)",
        },

        cyan: {
          50: "#ecfeff",
          100: "#cffafe",
          200: "#a5f3fc",
          300: "#67e8f9",
          400: "#22d3ee",
          500: "#06b6d4",
          600: "#0891b2",
          700: "#0e7490",
          800: "#155e75",
          900: "#164e63",
        },

        surface: {
          50: "#fafbff",
          100: "#f5f7ff",
          200: "#eef1f8",
          300: "#e4e8f1",
          400: "#d7dceb",
        },

        success: {
          DEFAULT: "#10b981",
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
        },

        warning: {
          DEFAULT: "#f59e0b",
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
        },

        danger: {
          DEFAULT: "#ef4444",
          50: "#fef2f2",
          100: "#fee2e2",
          200: "#fecaca",
          300: "#fca5a5",
          400: "#f87171",
          500: "#ef4444",
          600: "#dc2626",
          700: "#b91c1c",
          800: "#991b1b",
          900: "#7f1d1d",
        },
      },

      fontFamily: {
        sans: ["Nunito", "system-ui", "sans-serif"],
      },

      borderRadius: {
        card: "1.25rem",
        panel: "1.5rem",
        hero: "2rem",
      },

      boxShadow: {
        xs: "var(--shadow-xs)",
        card: "var(--shadow-card)",
        cardHover: "var(--shadow-card-hover)",
        soft: "var(--shadow-soft)",
        medium: "var(--shadow-medium)",
        large: "var(--shadow-large)",
        primary: "var(--shadow-primary)",
        brand: "var(--shadow-brand)",
        violet: "var(--shadow-violet)",
        cyan: "var(--shadow-cyan)",
        navbar: "var(--shadow-navbar)",
        actionMenu: "var(--shadow-actionMenu)",
        glow: "var(--shadow-glow)",
        inner: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)",
      },

      backgroundImage: {
        "brand-gradient":
          "linear-gradient(135deg, var(--color-primary-600) 0%, var(--color-brand-600) 50%, var(--color-brand-500) 100%)",

        "brand-gradient-soft":
          "linear-gradient(135deg, var(--color-primary-50) 0%, var(--color-brand-50) 50%, var(--color-primary-100) 100%)",

        "dark-gradient":
          "linear-gradient(135deg, var(--color-ink-100) 0%, var(--color-ink-200) 55%, var(--color-ink-300) 100%)",

        "mesh-gradient":
          "radial-gradient(circle at 20% 20%, color-mix(in srgb, var(--color-primary-500) 16%, transparent), transparent 35%), radial-gradient(circle at 80% 20%, color-mix(in srgb, var(--color-brand-500) 14%, transparent), transparent 35%), radial-gradient(circle at 50% 80%, color-mix(in srgb, var(--color-brand-500) 12%, transparent), transparent 40%)",
      },
    },
  },

  plugins: [
    function ({ addUtilities }) {
      addUtilities({
        ".scrollbar-hide": {
          "-ms-overflow-style": "none",
          "scrollbar-width": "none",
        },

        ".scrollbar-hide::-webkit-scrollbar": {
          display: "none",
        },
      });
    },
  ],
};