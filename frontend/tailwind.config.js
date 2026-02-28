/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Avenir Next", "SF Pro Display", "PingFang SC", "Microsoft YaHei", "sans-serif"],
      },
      backgroundImage: {
        app: `
          radial-gradient(circle at 12% 14%, rgba(56, 189, 248, 0.20), transparent 34%),
          radial-gradient(circle at 84% 82%, rgba(125, 211, 252, 0.25), transparent 36%),
          linear-gradient(165deg, #eef8ff 0%, #f7fcff 42%, #eaf5ff 100%)
        `,
      },
      boxShadow: {
        soft: "0 12px 40px rgba(2,6,23,.45)",
      },
    },
  },
  plugins: [],
};
