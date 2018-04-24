module.exports = {
  extends: ["prettier"],
  parser: "babel-eslint",
  parserOptions: {
    ecmaVersion: 6,
    ecmaFeatures: {
      jsx: true,
    },
  },
  env: {
    es6: true,
  },
  overrides: {
    files: "src/**/*.js",
  },
  rules: {
    // Error for unused vars or imports
    "no-unused-vars": 2,
    // Error on console statements
    "no-console": 2,
    // No duplicate cases in switch statements
    "no-duplicate-case": 2,
    // No weird whitespace (should be covered by prettier, but called out)
    "no-irregular-whitespace": 2,
    // No template strings within '' or ""
    "no-template-curly-in-string": 2,
    // No weird multiline formatting
    "no-unexpected-multiline": 2,
    // No unreachable code
    "no-unreachable": 2,
    // Warn when re-assigning function parameters
    "no-param-reassign": 1,
    // Warn for "yoda" cases i.e. (-1 < someVariable)
    yoda: 1,
    // Warn for magic numbers
    "no-magic-numbers": 1,
    // Warn inner declarations
    "no-inner-declarations": 1,
    // Warn if no default case
    "default-case": 1,
    "flowtype/define-flow-type": 1,
    "prettier/prettier": 2,
  },
  plugins: ["babel", "flowtype", "prettier"],
};
