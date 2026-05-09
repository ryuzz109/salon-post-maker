import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        linen: "#fbf6ef",
        moss: "#6f8b74",
        ink: "#29302b",
        clay: "#b87858",
        petal: "#eac4bd",
        cream: "#fffdf8"
      },
      boxShadow: {
        soft: "0 18px 45px rgba(41, 48, 43, 0.10)"
      }
    }
  },
  plugins: []
};

export default config;
