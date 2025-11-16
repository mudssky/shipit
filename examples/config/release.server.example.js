module.exports = {
  upload: {
    defaultProvider: "oss",
    oss: {
      provider: "aliyun",
      bucket: "your-bucket",
      region: "cn-hangzhou",
      endpoint: "https://oss-cn-hangzhou.aliyuncs.com",
      prefix: "releases/",
      requiredPrefix: "releases/",
      accessKeyId: "YOUR_AK",
      accessKeySecret: "YOUR_SK",
    },
  },
  release: {
    defaultProvider: "oss",
    targetDir: "./releases",
    listLimit: 20,
    allowedTargetDirPrefix: "./",
    listOutputStyle: "table",
  },
  hooks: {
    beforeRelease: [{ type: "shell", value: "./scripts/beforeRelease.sh" }],
    afterRelease: [
      {
        type: "shell",
        value: "./scripts/afterRelease.sh",
      },
    ],
    shell: process.platform === "win32" ? "powershell" : "bash",
  },
};
