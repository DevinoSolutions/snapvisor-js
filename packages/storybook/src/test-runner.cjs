const argosScreenshot = async (...args) => {
  const { argosScreenshot } = await import("./test-runner.mjs");
  return argosScreenshot(...args);
};
exports.argosScreenshot = argosScreenshot;
const snapvisorScreenshot = async (...args) => {
  const { snapvisorScreenshot } = await import("./test-runner.mjs");
  return snapvisorScreenshot(...args);
};
exports.snapvisorScreenshot = snapvisorScreenshot;
