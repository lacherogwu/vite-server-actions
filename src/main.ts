import type { Plugin } from 'vite';
import { compileActionsFile, writeModuleDTS, resolveActionsPath, isActionsFile } from './utils';
import { RESOLVED_VIRTUAL_MODULE_ID, VIRTUAL_MODULE_ID } from './constants';
import type { ServerActionsOptions } from './types';
export type * from './types';

const TYPE_DECLARATION = `
declare module 'vite:actions' {
  export const actions: Record<string, (...args: any[]) => Promise<any>>;
}
`;

export default function serverActions(options: ServerActionsOptions = {}): Plugin {
	let compiledCode: string = '';
	let root: string;

	return {
		name: 'vite-server-actions',
		configResolved(config) {
			root = config.root;
		},

		async buildStart() {
			compiledCode = await compileActionsFile(root, options.actionsDir);
			console.log('🚀 → buildStart → compiledCode:', compiledCode);
			await writeModuleDTS(root, options.actionsDir);
		},

		configureServer(server) {
			const watchDir = resolveActionsPath(root, options.actionsDir);
			server.watcher.add(watchDir);

			server.watcher.on('change', async path => {
				if (isActionsFile(path, options.actionsDir)) {
					compiledCode = await compileActionsFile(root, options.actionsDir);
				}
			});

			return () => {
				server.middlewares.use((_req, _res, next) => {
					next();
				});
			};
		},

		resolveId(id) {
			if (id === VIRTUAL_MODULE_ID) {
				return RESOLVED_VIRTUAL_MODULE_ID;
			}
			// Handle type declarations
			if (id === `${VIRTUAL_MODULE_ID}?types`) {
				return `\0${VIRTUAL_MODULE_ID}?types`;
			}
		},

		load(id) {
			if (id === RESOLVED_VIRTUAL_MODULE_ID) {
				console.log(compiledCode);
				return compiledCode;
			}
			// Return type declarations
			if (id === `\0${VIRTUAL_MODULE_ID}?types`) {
				return TYPE_DECLARATION;
			}
		},

		handleHotUpdate({ file, server }) {
			if (isActionsFile(file, options.actionsDir)) {
				const mod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_MODULE_ID);
				if (mod) {
					return [mod];
				}
			}
		},

		// async transform(code, _id) {
		// 	const oldImport = `import { actions } from "vite:actions";`;
		// 	if (code.includes(oldImport)) {
		// 		return code.replace(oldImport, `import actions from "${VIRTUAL_MODULE_ID}";`);
		// 	}
		// },

		generateBundle() {
			this.emitFile({
				type: 'asset',
				fileName: 'server-actions.d.ts',
				source: TYPE_DECLARATION,
			});
		},

		// PROD
		// generateBundle(options, bundle) {
		// 	// options.
		// 	console.log(options, bundle);
		// },
	};
}

// async function compileActionsFile() {
// 	// TODO: handle .vite folder

// 	const basePath = '/Users/asaf/Desktop/vite-server-actions/playground';
// 	const actionsEntryFilePath = `${basePath}/src/actions/index.ts`;
// 	const code = await fs.readFile(actionsEntryFilePath, 'utf-8');
// 	const result = await transformWithEsbuild(code, 'actions.ts', {
// 		format: 'esm',
// 	});

// 	await fs.writeFile(`${basePath}/.vite/actions.js`, result.code);
// }
