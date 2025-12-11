import type { JsonRpcResult } from "./json-rpc/result.js";
import type { RpcResponseHandler } from "./response-handler.js";

/**
 * Function responsible for handling the invocation of an RPC method.
 */
export type RpcMethodHandler = (
	parameters: unknown,
	response: RpcResponseHandler,
	next: () => RpcMethodHandlerResult,
) => RpcMethodHandlerResult;

/**
 * Result of the invocation of an RPC method.
 */
export type RpcMethodHandlerResult = JsonRpcResult | Promise<JsonRpcResult | void> | void;
