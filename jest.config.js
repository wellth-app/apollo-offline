module.exports = {
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  testMatch: ["<rootDir>/src/**/?(*.)(spec|test).{js,jsx,ts,tsx}"],
  collectCoverageFrom: ["src/**/*"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  modulePaths: ["<rootDir>/src/"],
  testEnvironment: "node",
};
