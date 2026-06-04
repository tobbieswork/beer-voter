import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@sentry')) {
              return 'sentry';
            }
            if (id.includes('qrcode')) {
              return 'qrcode';
            }
            if (id.includes('@react-oauth')) {
              return 'auth';
            }
            if (id.includes('i18next') || id.includes('react-i18next')) {
              return 'i18n';
            }
            return 'vendor'; // Tất cả các thư viện còn lại (react, react-dom, v.v.)
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true, // Expose ra mạng LAN cho thiết bị di động truy cập
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
