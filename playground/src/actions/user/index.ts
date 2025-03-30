import { defineAction, ACTION_ERROR_CODES } from 'vite:actions';
// import { spawn } from 'child_process';

export const list = defineAction({
	input: {},
	handler: (input, ctx) => {
		// spawn('ls', ['-la']);
		console.log(ACTION_ERROR_CODES);
		// code
	},
});

export const create = defineAction({
	handler: async (input, ctx) => {},
});
