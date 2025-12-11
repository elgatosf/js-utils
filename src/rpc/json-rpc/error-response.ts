import { z } from "zod/v4-mini";

import { JsonRpcError } from "./error.js";

/**
 * Error response object sent to a client.
 */
export interface JsonRpcErrorResponse {
	/**
	 * The JSON-RPC version.
	 */
	readonly jsonrpc: "2.0";

	/**
	 * The error that occurred.
	 */
	readonly error: JsonRpcError;

	/**
	 * Identifier of the RPC request, or null if there was an error detecting the id of the request.
	 */
	readonly id: string | null;
}

/**
 * Error response object sent to a client.
 */
export const JsonRpcErrorResponse: z.ZodMiniType<JsonRpcErrorResponse> = z.strictObject({
	jsonrpc: z.literal("2.0"),
	error: JsonRpcError,
	id: z.union([z.string(), z.null()]),
});
