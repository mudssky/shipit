import { defineConfig } from '@rspack/cli'
import '@rspack/core'
import path from 'path'
// Target browsers, see: https://github.com/browserslist/browserslist
// const targets = ['chrome >= 87', 'edge >= 88', 'firefox >= 78', 'safari >= 14']
// const targets = ['node']

export default defineConfig({
  target: 'node',
  entry: {
    main: './src/index.ts',
  },
  externals: {
    playwright: 'commonjs playwright',
    // bufferutil: 'commonjs bufferutil',
    // 'utf-8-validate': 'commonjs utf-8-validate',
    cosmiconfig: 'commonjs cosmiconfig',
  },
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
    module: false, // 禁用ES模块输出
    chunkFormat: 'commonjs', // 使用CommonJS格式
    library: {
      type: 'commonjs', // 指定库类型为CommonJS
    },
  },
  experiments: {
    css: true,
    outputModule: false, // 禁用ES模块输出
  },
  optimization: {
    minimize: false,
    concatenateModules: false, // 保持模块分离
    innerGraph: false, // 禁用内部依赖分析
    usedExports: false, // 保留所有导出
    sideEffects: false, // 禁用副作用分析
  },
  resolve: {
    extensions: ['.js', '.ts'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: [
          {
            loader: 'builtin:swc-loader',
            options: {
              jsc: {
                parser: {
                  syntax: 'typescript',
                },
              },
            },
          },
        ],
      },
    ],
  },
})
