import { JsonRpcErrorCode } from "./json-rpc/error-code.js";
import type { JsonRpcRequest } from "./json-rpc/request.js";
import type { JsonRpcResponse } from "./json-rpc/response.js";
import type { RpcRequest } from "./request.js";
import type { RpcResponse } from "./response.js";

/**
 * Maintains a collection of pending requests.
 */
export class RpcRequestPool {
	/**
	 * Default request timeout in milliseconds; default is 30 seconds.
	 */
	static readonly #DEFAULT_TIMEOUT = 30000;

	/**
	 * Requests with pending responses.
	 */
	readonly #requests = new Map<string, (res: RpcResponse) => void>();

	/**
	 * Stream responsible for sending data.
	 */
	readonly #sendingStream: WritableStream<JsonRpcRequest>;

	/**
	 * Initializes a new instance of the {@link RpcRequestPool} class.
	 * @param sendingStream Stream responsible for sending data.
	 */
	constructor(sendingStream: WritableStream<JsonRpcRequest>) {
		this.#sendingStream = sendingStream;
	}

	/**
	 * Sends the requests to the sending stream, and adds it to the request pool. The request can then
	 * later be resolved externally.
	 * @param request Request to send, and add to the pool.
	 * @returns Promise that resolves to the request's response.
	 */
	public add(request: RpcRequest): Promise<RpcResponse> {
		const id = crypto.randomUUID();
		const { method, params, timeout = RpcRequestPool.#DEFAULT_TIMEOUT } = request;

		// Initialize the response handler.
		const response = new Promise<RpcResponse>((resolve) => {
			this.#requests.set(id, (res) => {
				clearTimeout(timeoutMonitor);
				resolve(res as RpcResponse);
			});
		});

		// Start the timeout, and send the request.
		const timeoutMonitor = setTimeout(() => {
			this.resolve({
				jsonrpc: "2.0",
				id,
				error: {
					code: JsonRpcErrorCode.InternalError,
					message: "The request timed out.",
				},
			});
		}, timeout);

		this.#send({ jsonrpc: "2.0", method, params, id });
		return response;
	}

	/**
	 * Resolves a pending request associated with the response.
	 * @param response The response used to resolve the request.
	 */
	public resolve(response: JsonRpcResponse): void {
		const { id } = response;

		// TODO: Provide better handling for unidentifiable errors.
		if (id == null) {
			return;
		}

		// Get the pending request.
		const handler = this.#requests.get(id);
		this.#requests.delete(id);

		// Resolve the request.
		if (handler) {
			if ("result" in response) {
				handler({
					ok: true,
					result: response.result,
				});
			} else {
				handler({
					ok: false,
					error: response.error,
				});
			}
		}
	}

	/**
	 * Sends the JSON-RPC value to the sending stream.
	 * @param value Value to send.
	 */
	#send(value: JsonRpcRequest): void {
		const writer = this.#sendingStream.getWriter();
		try {
			writer.write(value);
		} finally {
			writer.releaseLock();
		}
	}
}
