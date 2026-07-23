import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import tsconfigPaths from 'vite-tsconfig-paths'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'
// import { cloudflare } from '@cloudflare/vite-plugin'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  plugins: [
    // cloudflare({ viteEnvironment: { name: 'ssr' } }), // comment-out the if you'd like to deploy to aws
    devtools(),
    tsconfigPaths({ projects: ['./tsconfig.json'] }),
    tailwindcss(),

    // allow the below if you'd like to deploy to aws
    tanstackStart({
      server: {
        preset: 'node-server',
      },
    }),

    // tanstackStart(), // comment-out the if you'd like to deploy to aws
    viteReact(),
  ],
})

export default config
