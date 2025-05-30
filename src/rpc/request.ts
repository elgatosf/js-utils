import type { JsonObject, JsonValue } from "../json.js";

/**
 * Request options.
 */
export type RequestOptions<T extends RequestParameters = undefined> = {
	/**
	 * Name of the method to be invoked.
	 */
	method: string;

	/**
	 * Parameters to be used during the invocation of the method.
	 */
	params?: T;

	/**
	 * Timeout duration in milliseconds; defaults to `5000` (5s).
	 */
	timeout?: number;
};

/**
 * Parameters that can be sent with a request.
 */
export type RequestParameters = JsonObject | JsonValue[] | undefined;
