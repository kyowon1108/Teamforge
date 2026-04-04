import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    screens: {
      sm: "320px",
      md: "672px",
      lg: "1056px",
      xl: "1312px",
    },
    extend: {
      fontFamily: {
        sans: [
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "Apple SD Gothic Neo",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "Noto Sans",
          "sans-serif",
        ],
      },
      colors: {
        "tf-bg-layer-default": "var(--tf-bg-layer-default)",
        "tf-bg-layer-alt": "var(--tf-bg-layer-alt)",
        "tf-bg-brand-solid": "var(--tf-bg-brand-solid)",
        "tf-bg-positive": "var(--tf-bg-positive)",
        "tf-bg-negative": "var(--tf-bg-negative)",
        "tf-bg-warning": "var(--tf-bg-warning)",
        "tf-bg-info": "var(--tf-bg-info)",
        "tf-fg-default": "var(--tf-fg-default)",
        "tf-fg-muted": "var(--tf-fg-muted)",
        "tf-fg-subtle": "var(--tf-fg-subtle)",
        "tf-fg-disabled": "var(--tf-fg-disabled)",
        "tf-fg-inverse": "var(--tf-fg-inverse)",
        "tf-fg-brand": "var(--tf-fg-brand)",
        "tf-fg-positive": "var(--tf-fg-positive)",
        "tf-fg-negative": "var(--tf-fg-negative)",
        "tf-stroke-neutral": "var(--tf-stroke-neutral)",
        "tf-stroke-brand": "var(--tf-stroke-brand)",
        "tf-stroke-focus": "var(--tf-stroke-focus)",
      },
      borderRadius: {
        r1: "4px",
        r2: "8px",
        r3: "12px",
        r4: "16px",
        full: "9999px",
      },
    },
  },
  plugins: [],
};

export default config;
