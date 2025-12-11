import type { IDisposable } from "../explicit-resource-management/disposable.js";
import { withResolvers } from "../promises.js";
import type { RpcConnectionOptions } from "./connection-options.js";
import { RpcMethodDispatcher } from "./dispatcher.js";
import { JsonRpcErrorCode } from "./json-rpc/error-code.js";
import type { JsonRpcParameters } from "./json-rpc/parameters.js";
import { JsonRpcRequest } from "./json-rpc/request.js";
import { JsonRpcResponse } from "./json-rpc/response.js";
import type { RpcMethodHandler } from "./method-handler.js";
import { RpcNotificationResponseHandler } from "./notification-response-handler.js";
import { RpcRequestPool } from "./request-pool.js";
import { RpcRequestResponseHandler } from "./request-response-handler.js";
import type { RpcRequest } from "./request.js";
import type { RpcResponse } from "./response.js";

/**
 * Connection between a local and remote target, allowing for communication with JSON-RPC.
 */
export class RpcConnection {
	/**
	 * Dispatcher responsible for routing inbound requests to method handlers.
	 */
	readonly #dispatcher = new RpcMethodDispatcher();

	/**
	 * Determines whether the connection is active.
	 */
	#isConnected = false;

	/**
	 * Stream responsible for receiving data.
	 */
	readonly #receivingStream: ReadableStream<string>;

	/**
	 * Stream responsible for sending data.
	 */
	readonly #sendingStream: WritableStream<JsonRpcRequest | JsonRpcResponse>;

	/**
	 * Collection of pending requests.
	 */
	readonly #requestPool: RpcRequestPool;

	/**
	 * Initializes a new instance of the {@link RpcConnection} class.
	 * @param options The connection options.
	 */
	constructor(options: RpcConnectionOptions) {
		const { receivingStream, sendingStream } = options;

		this.#receivingStream = receivingStream;
		this.#sendingStream = sendingStream;

		this.#requestPool = new RpcRequestPool(sendingStream);
	}

	/**
	 * Adds a local method handler that will be called when the method is dispatched.
	 * @param method Method name.
	 * @param handler The handler to add.
	 * @returns Disposable used to remove the handler.
	 */
	public addLocalMethod(method: string, handler: RpcMethodHandler): IDisposable {
		return this.#dispatcher.add(method, handler);
	}

	/**
	 * Begins listening on the receiving stream, allowing for bi-directional communication with the remote target.
	 *
	 * The connection will remain active whilst the receiving stream is open, or until the signal is aborted.
	 * @param signal Optional abort signal used to determine the connection.
	 */
	public async connect(signal?: AbortSignal): Promise<void> {
		// Check if the connection is already established.
		if (this.#isConnected) {
			throw new Error("JSON-RPC connection is already connected.");
		}

		const { promise, resolve, reject } = withResolvers();

		// Configure the abort signal to throw an error for callers awaiting the connection.
		if (signal) {
			signal.onabort = (): void => reject("JSON-RPC connection was aborted.");
		}

		try {
			this.#isConnected = true;

			// Start reading from the receiving stream.
			await Promise.race([
				this.#readReceivingStream(signal ?? new AbortSignal()),
				promise,
			]);
		} finally {
			// Clean-up the resolvers.
			this.#isConnected = false;
			resolve();
		}
	}

	/**
	 * Sends a notification to the JSON-RPC server without waiting for its response.
	 * @param request The request.
	 */
	public async notify(request: RpcRequest): Promise<void>;
	/**
	 * Sends a notification to the JSON-RPC server without waiting for its response.
	 * @param method Name of the method to invoke.
	 * @param params Parameters passed to the method handlers.
	 */
	public async notify(method: string, params?: JsonRpcParameters): Promise<void>;
	/**
	 * Sends a notification to the JSON-RPC server without waiting for its response.
	 * @param methodOrRequest The method name, or the request.
	 * @param params Parameters passed to the method handlers.
	 */
	public async notify(methodOrRequest: RpcRequest | string, params?: JsonRpcParameters): Promise<void> {
		if (typeof methodOrRequest === "string") {
			this.#send({ jsonrpc: "2.0", method: methodOrRequest, params });
		} else {
			const { method, params } = methodOrRequest;
			this.#send({ jsonrpc: "2.0", method, params });
		}
	}

	/**
	 * Sends the request to the JSON-RPC server.
	 * @param request The request.
	 * @returns The response.
	 */
	public async request(request: RpcRequest): Promise<RpcResponse>;
	/**
	 * Sends the request to the JSON-RPC server.
	 * @param method Name of the method to invoke.
	 * @param params Parameters passed to the method handlers.
	 * @returns The response.
	 */
	public async request(method: string, params?: JsonRpcParameters): Promise<RpcResponse>;
	/**
	 * Sends the request to the JSON-RPC server.
	 * @param methodOrRequest The method name, or the request.
	 * @param params Parameters passed to the method handlers.
	 * @returns The response.
	 */
	public async request(methodOrRequest: RpcRequest | string, params?: JsonRpcParameters): Promise<RpcResponse> {
		if (typeof methodOrRequest === "string") {
			return this.#requestPool.add({ method: methodOrRequest, params });
		} else {
			return this.#requestPool.add(methodOrRequest);
		}
	}

	/**
	 * Parses the value read from the receiving stream.
	 * - Requests are dispatched to their method handlers.
	 * - Responses resolve their associated pending requests.
	 *
	 * When the value is neither a request or response, a parsing error is sent to the sending stream.
	 * @param value Value to parse.
	 */
	#parse(value: string): void {
		// Check if the value is a request.
		const { success: isRequest, data: req } = JsonRpcRequest.safeParse(value);
		if (isRequest) {
			const { method, params } = req;
			const responseHandler = req.id
				? new RpcRequestResponseHandler(req.id, this.#sendingStream)
				: new RpcNotificationResponseHandler();

			this.#dispatcher.dispatch(method, params, responseHandler);
			return;
		}

		// Check if the value is a response.
		const { success: isResponse, data: res } = JsonRpcResponse.safeParse(value);
		if (isResponse) {
			this.#requestPool.resolve(res);
			return;
		}

		// Unknown value, respond with a parsing error.
		this.#send({
			jsonrpc: "2.0",
			id: null,
			error: {
				code: JsonRpcErrorCode.ParseError,
				message: "Unable to parse JSON-RPC value.",
				data: value,
			},
		});
	}

	/**
	 * Continually reads the receiving stream and attempts to parse read data as  JSON-RPC messages.
	 * Reading continues until the receiving stream is closed, or the signal is aborted.
	 * @param signal Abort signal used to stream reading.
	 */
	async #readReceivingStream(signal: AbortSignal): Promise<void> {
		const reader = this.#receivingStream.getReader();

		try {
			// Continually read from the receiving stream until aborted or done.
			while (!signal?.aborted) {
				const { done, value } = await reader.read();
				if (done) {
					return;
				}

				// Parse the received value.
				this.#parse(value);
			}
		} finally {
			reader.releaseLock();
		}
	}

	/**
	 * Sends the JSON-RPC value to the sending stream.
	 * @param value Value to send.
	 */
	#send(value: JsonRpcRequest | JsonRpcResponse): void {
		const writer = this.#sendingStream.getWriter();
		try {
			writer.write(value);
		} finally {
			writer.releaseLock();
		}
	}
}
