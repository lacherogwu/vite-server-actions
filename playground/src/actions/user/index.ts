import { defineAction, ACTION_ERROR_CODES } from 'vite:actions';

export const list = defineAction({
	input: {},
	handler: (input, ctx) => {
		console.log(ACTION_ERROR_CODES);
		// code
	},
});

export const create = defineAction({
	handler: async (input, ctx) => {},
});
