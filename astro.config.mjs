import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  site: 'https://shareinfo.co.kr',
  build: {
    inlineStylesheets: 'always',
  },
});