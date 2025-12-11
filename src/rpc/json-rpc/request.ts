import { z } from "zod/v4-mini";

import type { JsonRpcParameters } from "./parameters.js";

/**
 * Request object sent to a server.
 */
export interface JsonRpcRequest {
	/**
	 * Identifies the request; when undefined, the request is treated as a notification.
	 */
	readonly id?: string;

	/**
	 * The JSON-RPC version.
	 */
	readonly jsonrpc: "2.0";

	/**
	 * Name of the method to invoke.
	 */
	readonly method: string;

	/**
	 * Optional parameters supplied to the method.
	 */
	readonly params?: JsonRpcParameters;
}

/**
 * Request object sent to a server.
 */
export const JsonRpcRequest: z.ZodMiniType<JsonRpcRequest> = z.object({
	id: z.optional(z.string()),
	jsonrpc: z.literal("2.0"),
	method: z.string(),
	params: z.optional(
		z.union([
			z.record(z.string(), z.any()),
			z.array(z.any()),
		]),
	),
});
