import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import type { UserConfig } from 'vite';
import type { InlineConfig } from 'vitest';

// Define a type that includes Vitest config
interface VitestConfigExport extends UserConfig {
    test: InlineConfig;
}

export default defineConfig({
    plugins: [react()],
    server: {
        port: 3000,
        proxy: {
            '/1.0': 'http://localhost:8080',
            '/api': 'http://localhost:8080',
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    test: {
        globals: true,
        environment: 'happy-dom',
        setupFiles: './src/test/setup.ts',
        css: true,
    },
})
