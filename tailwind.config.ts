import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        accent: "#06d6a0",
        surface: {
          DEFAULT: "#111827",
          light: "#1f2937",
        },
      },
    },
  },
  plugins: [],
};

export default config;
