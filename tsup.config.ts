import { defineConfig } from 'tsup';

export default defineConfig(options => ({
	name: 'vite-server-actions',
	entry: ['src/main.ts', 'src/client.ts'],
	format: ['esm'],
	bundle: true,
	// clean: true,
	dts: true,
}));
