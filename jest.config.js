const config = {
  roots: ["<rootDir>/src/", "<rootDir>/test/"],
  transform: {
    "\\.[jt]sx?$":[ "ts-jest",  {
      "useESM": true
    }],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.[jt]s$': '$1',
  },
  extensionsToTreatAsEsm: [".ts"],
  testRegex: "(/__tests__/.*|\\.(test|spec))\\.[tj]sx?$",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  testEnvironment: "node",
};

export default config
