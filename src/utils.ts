import { resolve } from 'node:path';
import fs from 'node:fs/promises';
import { build } from 'esbuild';

function getActionsDir(actionsDir?: string): string {
	return actionsDir || 'src/actions';
}

export function resolveActionsPath(root: string, actionsDir?: string) {
	return resolve(root, getActionsDir(actionsDir), 'index.ts');
}

export async function compileActionsFile(root: string, actionsDir?: string): Promise<string> {
	let compiledCode: string = '';
	try {
		const entryFile = resolveActionsPath(root, actionsDir);
		try {
			await fs.access(entryFile);
		} catch (e) {
			console.warn(`Actions entry file not found at ${entryFile}`);
			compiledCode = 'export const actions = {};';
			return compiledCode;
		}

		const clientFile = resolve(import.meta.dirname, 'client.js');

		const virtualEntry = `
		export { default as actions } from '${entryFile}';
		export * from '${clientFile}';
	  `;
		const result = await build({
			stdin: {
				contents: virtualEntry,
				loader: 'ts',
				resolveDir: root,
				sourcefile: 'virtual-entry.ts',
			},
			bundle: true,
			write: false,
			format: 'esm',
			target: 'esnext',
			platform: 'neutral',
			sourcemap: false,
			external: ['vite:actions'],
			outdir: 'dist',
		});

		compiledCode = result.outputFiles[0].text;
	} catch (error) {
		console.error('Error compiling actions file:', error);
		throw error;
	}

	return compiledCode;
}

export async function writeModuleDTS(root: string, actionsDir?: string) {
	const entryFile = resolveActionsPath(root, actionsDir);

	const code = `
declare module "vite:actions" {
	type Actions = typeof import("${entryFile}")["default"];
	export * from 'vite-server-actions/client';
	export const actions: Actions;
}`;

	await fs.writeFile(resolve(import.meta.dirname, 'types.d.ts'), code);
}

export function isActionsFile(file: string, actionsDir?: string): boolean {
	const normalizedActionsDir = getActionsDir(actionsDir).replace(/\\/g, '/');
	const normalizedFile = file.replace(/\\/g, '/');
	return normalizedFile.includes(normalizedActionsDir);
}
