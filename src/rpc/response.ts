import type { JsonRpcError } from "./json-rpc/error.js";
import type { JsonRpcResult } from "./json-rpc/result.js";

/**
 * An RPC response received from a server.
 */
export type RpcResponse =
	| {
			/**
			 * Determines whether the request was successful.
			 */
			readonly ok: false;

			/**
			 * The error that occurred.
			 */
			readonly error: JsonRpcError;
	  }
	| {
			/**
			 * Determines whether the request was successful.
			 */
			readonly ok: true;

			/**
			 * Result of the request.
			 */
			readonly result: JsonRpcResult;
	  };
