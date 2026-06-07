/**
 * @file ESLint 配置
 * @description 在 Taro 默认配置基础上调整规则
 */

module.exports = {
  extends: ['taro'],
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'off',
    'react/react-in-jsx-scope': 'off',
  },
}
