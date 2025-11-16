import { defineConfig } from '@mudssky/shipit'

export default defineConfig({
  artifact: {
    defaultPath: './dist/release.zip',
    nameTemplate: 'release-{yyyy}{MM}{dd}{HH}{mm}{ss}.zip',
  },
  upload: {
    defaultProvider: 'oss',
    oss: {
      provider: 'aliyun',
      bucket: 'your-bucket',
      region: 'cn-hangzhou',
      endpoint: 'https://oss-cn-hangzhou.aliyuncs.com',
      prefix: 'releases/',
      requiredPrefix: 'releases/',
      accessKeyId: 'YOUR_AK',
      accessKeySecret: 'YOUR_SK',
    },
    server: {
      endpoint: 'https://api.example.com/upload',
      headers: { Authorization: 'Bearer YOUR_UPLOAD_TOKEN' },
      targetDir: '/var/www/releases',
    },
  },
  release: {
    defaultProvider: 'server',
    targetDir: './releases',
    listLimit: 20,
    allowedTargetDirPrefix: './',
    listOutputStyle: 'table',
  },
  hooks: {
    beforeUpload: [
      { type: 'shell', value: 'echo BuildStart', shell: 'powershell' },
      { type: 'ts', value: './scripts/beforeUpload.ts', engine: 'tsx' },
    ],
    afterUpload: [
      { type: 'shell', value: 'echo BuildDone', shell: 'powershell' },
    ],
    beforeRelease: [
      { type: 'ts', value: './scripts/beforeRelease.ts', engine: 'tsx' },
    ],
    afterRelease: [
      { type: 'shell', value: 'echo ReleaseDone', shell: 'powershell' },
    ],
    shell: process.platform === 'win32' ? 'powershell' : 'bash',
  },
  server: {
    baseUrl: 'https://api.example.com',
    token: 'YOUR_SERVER_TOKEN',
  },
})
