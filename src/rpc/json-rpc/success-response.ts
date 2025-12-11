import { z } from "zod/v4-mini";

import type { JsonRpcResult } from "./result.js";

/**
 * Successful response object sent to a client.
 */
export interface JsonRpcSuccessResponse {
	/**
	 * The JSON-RPC version.
	 */
	readonly jsonrpc: "2.0";

	/**
	 * Result of the RPC request.
	 */
	readonly result: JsonRpcResult;

	/**
	 * Identifier of the RPC request.
	 */
	readonly id: string;
}

/**
 * Successful response object sent to a client.
 */
export const JsonRpcSuccessResponse: z.ZodMiniType<JsonRpcSuccessResponse> = z.strictObject({
	jsonrpc: z.literal("2.0"),
	result: z.any(),
	id: z.string(),
});
