export function defineAction({ input, output, handler }: { input?: any; output?: any; handler: any }) {
	return {
		input,
		output,
		handler,
	};
}
