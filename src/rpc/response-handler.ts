import type { JsonRpcError } from "./json-rpc/error.js";
import type { JsonRpcResult } from "./json-rpc/result.js";

/**
 * Handler responsible for sending responses to a client.
 */
export interface RpcResponseHandler {
	/**
	 * Determines whether the response handler is in a state where it can respond.
	 */
	get canRespond(): boolean;

	/**
	 * Send an error response to the client.
	 * @param error The error.
	 */
	error(error: JsonRpcError): void;

	/**
	 * Send a success response to the client.
	 * @param result The result.
	 */
	send(result: JsonRpcResult): void;
}
