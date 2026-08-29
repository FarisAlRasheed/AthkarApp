// The three crashes this config exists to prevent — showCompletion's
// `currentFileIndex` and openSheikhGrouping's `athkarCollections` — were
// undeclared globals left behind by a refactor. In a project with no build step
// and no modules, nothing caught them until a user hit the code path.
// `no-undef` does.

const browser = {
  window: 'readonly', document: 'readonly', localStorage: 'readonly',
  navigator: 'readonly', fetch: 'readonly', console: 'readonly',
  setTimeout: 'readonly', clearTimeout: 'readonly',
  setInterval: 'readonly', clearInterval: 'readonly',
  requestAnimationFrame: 'readonly', cancelAnimationFrame: 'readonly',
  Audio: 'readonly', URL: 'readonly', Event: 'readonly',
  getComputedStyle: 'readonly', location: 'readonly', alert: 'readonly',
};

const rules = {
  'no-undef': 'error',
  'no-redeclare': 'error',
  // Empty `catch (e) {}` blocks are idiomatic here for optional storage access.
  'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none', varsIgnorePattern: '^_' }],
};

const languageOptions = { ecmaVersion: 2022, sourceType: 'script' };

module.exports = [
  {
    // Loaded first; owns the shared helpers and publishes window.AthkarApp.
    files: ['script.js'],
    languageOptions: { ...languageOptions, globals: { ...browser, MainMenu: 'readonly' } },
    rules,
  },
  {
    // Loaded second; reads globals that script.js defined.
    files: ['main-menu.js'],
    languageOptions: {
      ...languageOptions,
      globals: {
        ...browser,
        AthkarApp: 'readonly',
        toArabicDigits: 'readonly',
        MainMenu: 'writable',
      },
    },
    rules,
  },
];
