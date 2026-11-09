import { defineConfig } from 'vite';
import multiplayer from './server/multiplayer.js';

export default defineConfig({
  plugins: [multiplayer()],
  server: {
    host: true, // let other computers on the home Wi-Fi join
    watch: { ignored: ['**/saves/**'] },
  },
});
