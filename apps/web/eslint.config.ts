import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
  {
    ignores: [".next/**", ".next-e2e/**"]
  },
  ...nextVitals
];

export default config;
