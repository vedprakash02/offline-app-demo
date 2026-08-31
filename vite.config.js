import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
    server: {
    watch: {
      usePolling: true, // यह जबरदस्ती फाइल में बदलावों को चेक करता रहेगा
    },
  },
})




