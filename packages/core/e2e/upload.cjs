const { upload } = require("@snapvisor/core");
const { runUpload } = require("./run-upload.cjs");

runUpload(
  upload,
  `argos-core-e2e-cjs-node-${process.env.NODE_VERSION}-${process.env.OS}`,
);
