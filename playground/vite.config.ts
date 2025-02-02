import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import inspect from 'vite-plugin-inspect';
import serverActions from 'vite-server-actions';

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		inspect(), //
		vue(),
		serverActions(),
	],
	build: {
		rollupOptions: {
			external: ['@ast/db'],
		},
	},
});
