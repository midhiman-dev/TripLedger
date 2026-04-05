import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#f4fafd",
        surface: "#f4fafd",
        "surface-container-low": "#eef5f7",
        "surface-container-lowest": "#ffffff",
        "surface-container-high": "#e2e9ec",
        "surface-container-highest": "#dde4e6",
        "surface-variant": "#dde4e6",
        primary: "#1a1c54",
        "primary-container": "#30336b",
        secondary: "#865300",
        "secondary-container": "#fea520",
        tertiary: "#002b12",
        "tertiary-container": "#00431f",
        outline: "#777680",
        "outline-variant": "#c7c5d1",
        "on-surface": "#161d1f",
        "on-primary": "#ffffff",
        "on-primary-container": "#e1e0ff",
        "on-secondary-container": "#694000",
        "on-tertiary-container": "#7efba4",
      },
      borderRadius: {
        xl: "1.5rem",
        "2xl": "2rem",
        "3xl": "2.5rem",
      },
      boxShadow: {
        ambient: "0 12px 24px rgba(26, 28, 84, 0.06)",
      },
      fontFamily: {
        headline: ["\"Plus Jakarta Sans\"", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
      backgroundImage: {
        "hero-gradient":
          "linear-gradient(135deg, rgba(26,28,84,1) 0%, rgba(48,51,107,1) 100%)",
      },
    },
  },
  plugins: [],
} satisfies Config;
