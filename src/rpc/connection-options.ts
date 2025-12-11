import type { ReadableStreamController } from "node:stream/web";

import type { JsonRpcRequest } from "./json-rpc/request.js";
import type { JsonRpcResponse } from "./json-rpc/response.js";

/**
 * Creates JSON-RPC connection options whose receiving and sending streams are delegated.
 * @param send Delegate responsible for sending data.
 * @returns The options.
 */
export function createRpcConnectionOptionsWithDelegates(
	send: (value: JsonRpcRequest | JsonRpcResponse) => void,
): RpcConnectionOptionsWithDelegates {
	let receivingController: ReadableStreamController<string> | undefined;
	const receivingStream = new ReadableStream<string>({
		start: (controller): void => {
			receivingController = controller;
		},
	});

	const sendingStream = new WritableStream<JsonRpcRequest | JsonRpcResponse>({
		write: (value): void => send(value),
	});

	return {
		receive: (value: string): void => receivingController?.enqueue(value),
		receivingStream,
		sendingStream,
	};
}

/**
 * Options associated with a JSON-RPC connection.
 */
export interface RpcConnectionOptions {
	/**
	 * Stream responsible for receiving data.
	 */
	receivingStream: ReadableStream<string>;

	/**
	 * Stream responsible for sending data.
	 */
	sendingStream: WritableStream<JsonRpcRequest | JsonRpcResponse>;
}

/**
 * Options associated with a JSON-RPC connection whose streams have been delegated to functions.
 */
export interface RpcConnectionOptionsWithDelegates extends RpcConnectionOptions {
	/**
	 * Sends the value to the receiving stream, allowing it to be processed by the connection.
	 * @param value Value being received.
	 */
	receive: (value: string) => void;
}
