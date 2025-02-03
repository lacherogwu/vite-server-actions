import { z } from 'zod';

/**
 * Used to preserve the input schema type in the error object.
 * This allows for type inference on the `fields` property
 * when type narrowed to an `ActionInputError`.
 *
 * Example: Action has an input schema of `{ name: z.string() }`.
 * When calling the action and checking `isInputError(result.error)`,
 * `result.error.fields` will be typed with the `name` field.
 */
export type ErrorInferenceObject = Record<string, any>;

export const ACTION_ERROR_CODES = [
	'BAD_REQUEST',
	'UNAUTHORIZED',
	'FORBIDDEN',
	'NOT_FOUND',
	'TIMEOUT',
	'CONFLICT',
	'PRECONDITION_FAILED',
	'PAYLOAD_TOO_LARGE',
	'UNSUPPORTED_MEDIA_TYPE',
	'UNPROCESSABLE_CONTENT',
	'TOO_MANY_REQUESTS',
	'CLIENT_CLOSED_REQUEST',
	'INTERNAL_SERVER_ERROR',
] as const;

export type ActionErrorCode = (typeof ACTION_ERROR_CODES)[number];

const codeToStatusMap = {
	// Implemented from tRPC error code table
	// https://trpc.io/docs/server/error-handling#error-codes
	BAD_REQUEST: 400,
	UNAUTHORIZED: 401,
	FORBIDDEN: 403,
	NOT_FOUND: 404,
	TIMEOUT: 405,
	CONFLICT: 409,
	PRECONDITION_FAILED: 412,
	PAYLOAD_TOO_LARGE: 413,
	UNSUPPORTED_MEDIA_TYPE: 415,
	UNPROCESSABLE_CONTENT: 422,
	TOO_MANY_REQUESTS: 429,
	CLIENT_CLOSED_REQUEST: 499,
	INTERNAL_SERVER_ERROR: 500,
};

const statusToCodeMap: Record<number, ActionErrorCode> = Object.entries(codeToStatusMap).reduce(
	// reverse the key-value pairs
	(acc, [key, value]) => ({ ...acc, [value]: key }),
	{},
);

// T is used for error inference with SafeInput -> isInputError.
// See: https://github.com/withastro/astro/pull/11173/files#r1622767246
export class ActionError<_T extends ErrorInferenceObject = ErrorInferenceObject> extends Error {
	type = 'ActionError';
	code: ActionErrorCode = 'INTERNAL_SERVER_ERROR';
	status = 500;

	constructor(params: { message?: string; code: ActionErrorCode; stack?: string }) {
		super(params.message);
		this.code = params.code;
		this.status = ActionError.codeToStatus(params.code);
		if (params.stack) {
			this.stack = params.stack;
		}
	}

	static codeToStatus(code: ActionErrorCode): number {
		return codeToStatusMap[code];
	}

	static statusToCode(status: number): ActionErrorCode {
		return statusToCodeMap[status] ?? 'INTERNAL_SERVER_ERROR';
	}

	static fromJson(body: any) {
		if (isInputError(body)) {
			return new ActionInputError(body.issues);
		}
		if (isActionError(body)) {
			return new ActionError(body);
		}
		return new ActionError({
			code: 'INTERNAL_SERVER_ERROR',
		});
	}
}

export function isActionError(error?: unknown): error is ActionError {
	return typeof error === 'object' && error != null && 'type' in error && error.type === 'ActionError';
}

export class ActionInputError<T extends ErrorInferenceObject> extends ActionError {
	type: string = 'ActionInputError';
	// We don't expose all ZodError properties.
	// Not all properties will serialize from server to client,
	// and we don't want to import the full ZodError object into the client.
	issues: z.ZodIssue[];
	fields: z.ZodError<T>['formErrors']['fieldErrors'];
	constructor(issues: z.ZodIssue[]) {
		super({
			message: `Failed to validate: ${JSON.stringify(issues, null, 2)}`,
			code: 'BAD_REQUEST',
		});
		this.issues = issues;
		this.fields = {};
		for (const issue of issues) {
			if (issue.path.length > 0) {
				const key = issue.path[0].toString() as keyof typeof this.fields;
				this.fields[key] ??= [];
				this.fields[key]?.push(issue.message);
			}
		}
	}
}

export function isInputError<T extends ErrorInferenceObject>(error?: ActionError<T>): error is ActionInputError<T>;
export function isInputError(error?: unknown): error is ActionInputError<ErrorInferenceObject>;
export function isInputError<T extends ErrorInferenceObject>(error?: unknown | ActionError<T>): error is ActionInputError<T> {
	return typeof error === 'object' && error != null && 'type' in error && error.type === 'ActionInputError' && 'issues' in error && Array.isArray(error.issues);
}
