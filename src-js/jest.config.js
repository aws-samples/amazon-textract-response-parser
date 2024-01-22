module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  // `examples` packages define their own test commands
  testPathIgnorePatterns: ["/examples/", "/node_modules/"]
};
