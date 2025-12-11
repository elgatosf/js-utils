import { z } from "zod/v4-mini";

import type { JsonValue } from "../../json.js";
import type { JsonRpcErrorCode } from "./error-code.js";

/**
 * Contains information about an error that occurred on the server.
 */
export interface JsonRpcError {
	/**
	 * Indicates the error type that occurred.
	 */
	readonly code: JsonRpcErrorCode | number;

	/**
	 *
	 * Contains additional information about the error.
	 */
	readonly data?: JsonValue;

	/**
	 * Short description of the error.
	 */
	readonly message: string;
}

/**
 * Contains information about an error that occurred on the server.
 */
export const JsonRpcError: z.ZodMiniType<JsonRpcError> = z.object({
	code: z.number(),
	data: z.any(),
	message: z.string(),
});
