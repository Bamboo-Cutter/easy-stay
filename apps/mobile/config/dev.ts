import { defineConfig } from '@tarojs/cli';
import baseConfig from './index';

export default defineConfig({
  ...baseConfig,
  env: {
    NODE_ENV: 'development',
  },
  defineConstants: {
    API_BASE: '"http://localhost:3000"',
  },
});
