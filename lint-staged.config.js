export default {
  '*.{js,jsx,ts,tsx,json,md,yml,yaml}': ['prettier --write'],
  '*.{js,jsx,ts,tsx}': () => 'pnpm turbo lint',
};
