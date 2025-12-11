import type { JsonRpcParameters } from "./json-rpc/parameters.js";

/**
 * An RPC request that can be sent to a server.
 */
export interface RpcRequest {
	/**
	 * Name of the method to invoke.
	 */
	method: string;

	/**
	 * Parameters sent with the request.
	 */
	params?: JsonRpcParameters;

	/**
	 * Timeout duration in milliseconds; defaults to `5000` (5s).
	 */
	timeout?: number;
}
