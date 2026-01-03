/** @type {import("prettier").Config} */
const config = {
  semi: true,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'es5',
  printWidth: 100,
  plugins: [
    'prettier-plugin-organize-imports',
    'prettier-plugin-tailwindcss', // must be last
  ],
};

export default config;
