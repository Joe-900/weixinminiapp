import { defineConfig } from '@tarojs/cli'
import devConfig from './dev'

export default defineConfig(async (merge) => {
  const baseConfig = {
    projectName: 'reading-companion',
    date: '2026-6-7',
    designWidth: 750,
    deviceRatio: {
      640: 2.34 / 2,
      750: 1,
      375: 2,
      828: 1.81 / 2,
    },
    sourceRoot: 'src',
    outputRoot: 'dist',
    plugins: [],
    defineConstants: {},
    copy: { patterns: [], options: {} },
    framework: 'react',
    compiler: {
      type: 'webpack5',
      prebundle: { enable: false },
    },
    cache: { enable: false },
    sass: {
      data: '@import "D:/weixinminiapp/src/assets/styles/variables.scss";',
    },
    mini: {
      postcss: {
        pxtransform: { enable: true, config: {} },
        cssModules: {
          enable: false,
        },
      },
    },
    h5: {
      publicPath: '/',
      staticDirectory: 'static',
      postcss: {
        autoprefixer: { enable: true, config: {} },
        cssModules: {
          enable: false,
        },
      },
    },
    alias: {
      '@': './src',
      '@cloud': './cloud',
    },
  }

  if (process.env.NODE_ENV === 'development') {
    return merge({}, baseConfig, devConfig)
  }
  return baseConfig
})
