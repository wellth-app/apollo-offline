module.exports = {
  plugins: [
    "prettier",
    "jest",
    "@typescript-eslint"
  ],

  extends: [
    "eslint:recommended",
    "airbnb-base",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:import/typescript",
    "plugin:prettier/recommended",
    "prettier",
    "prettier/@typescript-eslint"
  ],

  parser: "@typescript-eslint/parser",

  parserOptions: {
    ecmaVersion: "es6",
    tsconfigRootDir: __dirname,
    project: "tsconfig.json"
  },

  env: {
    es6: true,
    node: true,
  },

  ignorePatterns: [
    ".eslintrc.js"
  ],

  rules: {
    "import/extensions": [
      "error",
      "ignorePackages",
      {
        "js": "never",
        "jsx": "never",
        "ts": "never",
        "tsx": "never"
      }
    ],
    "no-console": 2,
    "quotes": ["error", "double", { "avoidEscape": true }],

    "@typescript-eslint/no-unsafe-call": 1,
    "@typescript-eslint/no-unsafe-assignment": 1,
    "@typescript-eslint/no-unsafe-member-access": 1,
  },

  settings: {
    "import/parsers": {
      "@typescript-eslint/parser": [".ts", ".tsx"]
    },
    "import/resolver": {
      "node": {
        "paths": ["src"],
        "extensions": [".ts", ".tsx"]
      }
    }
  }
};
