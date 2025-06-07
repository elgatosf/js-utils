import { EventEmitter } from "../event-emitter.js";
import type { JsonValue } from "../json.js";
import { JsonRpcErrorCode } from "./json-rpc/error.js";
import type { JsonRpcRequest } from "./json-rpc/request.js";
import { JsonRpcResponse } from "./json-rpc/response.js";
import type { RpcProxy } from "./proxy.js";
import { type RpcRequestOptions, type RpcRequestParameters } from "./request.js";
import { type RpcResponse, type RpcResponseResult } from "./response.js";

/**
 * Events that can occur as part of an RPC client.
 */
type RpcClientEventMap = {
	/**
	 * Occurs when a response was returned that did not contain an identifier.
	 */
	unidentifiedResponse: [RpcResponse];
};

/**
 * Client capable of sending requests to, and receiving responses from, a server.
 */
export class RpcClient extends EventEmitter<RpcClientEventMap> {
	/**
	 * Proxy responsible for sending requests to a server.
	 */
	readonly #proxy: RpcProxy;

	/**
	 * Requests with pending responses.
	 */
	readonly #requests = new Map<string, (res: RpcResponse) => void>();

	/**
	 * Initializes a new instance of the {@link RpcClient} class.
	 * @param proxy Proxy responsible for sending requests to a server
	 */
	constructor(proxy: RpcProxy) {
		super();
		this.#proxy = proxy;
	}

	/**
	 * Sends a notification to the listening server.
	 * @param request The request.
	 */
	public async notify(request: RpcRequestOptions): Promise<void>;
	/**
	 * Sends a notification to the listening server.
	 * @param method Name of the method to invoke.
	 * @param params Parameters to be used during the invocation of the method.
	 */
	public async notify(method: string, params?: RpcRequestParameters): Promise<void>;
	/**
	 * Sends a notification to the listening server.
	 * @param methodOrRequest The method name, or the request.
	 * @param params Parameters to be used during the invocation of the method.
	 */
	public async notify(methodOrRequest: RpcRequestOptions | string, params?: RpcRequestParameters): Promise<void> {
		if (typeof methodOrRequest === "string") {
			await this.#proxy({
				jsonrpc: "2.0",
				method: methodOrRequest,
				params,
			} satisfies JsonRpcRequest);
		} else {
			await this.#proxy({
				jsonrpc: "2.0",
				method: methodOrRequest.method,
				params: methodOrRequest.params,
			} satisfies JsonRpcRequest);
		}
	}

	/**
	 * Attempts to process the specified value as a response from a server.
	 * @param value Value to process.
	 * @returns `true` when the client was able to process the value as a response; otherwise `false`.
	 */
	public async receive(value: JsonValue): Promise<boolean> {
		const { success, data: response } = JsonRpcResponse.safeParse(value);
		if (!success) {
			return false;
		}

		if ("result" in response) {
			this.#resolve(response.id, {
				ok: true,
				result: response.result,
			});
		} else {
			this.#resolve(response.id, {
				ok: false,
				error: response.error,
			});
		}

		return true;
	}

	/**
	 * Sends the request to the listening server.
	 * @param request The request.
	 * @returns The response.
	 */
	public async request<TResult extends RpcResponseResult>(request: RpcRequestOptions): Promise<RpcResponse<TResult>>;
	/**
	 * Sends the request to the listening server.
	 * @param method Name of the method to invoke.
	 * @param params Parameters to be used during the invocation of the method.
	 * @returns The response.
	 */
	public async request<TResult extends RpcResponseResult>(
		method: string,
		params?: RpcRequestParameters,
	): Promise<RpcResponse<TResult>>;
	/**
	 * Sends the request to the listening server.
	 * @param methodOrRequest The method name, or the request.
	 * @param params Parameters to be used during the invocation of the method.
	 * @returns The response.
	 */
	public async request<TResult extends RpcResponseResult>(
		methodOrRequest: RpcRequestOptions | string,
		params?: RpcRequestParameters,
	): Promise<RpcResponse<TResult>> {
		if (typeof methodOrRequest === "string") {
			return this.#send({
				method: methodOrRequest,
				params,
			});
		} else {
			return this.#send(methodOrRequest);
		}
	}

	/**
	 * Resolves pending requests.
	 * @param id The request identifier.
	 * @param response The response.
	 */
	#resolve(id: string | undefined, response: RpcResponse): void {
		if (id === undefined) {
			this.emit("unidentifiedResponse", response);
			return;
		}

		// Get the handler
		const handler = this.#requests.get(id);
		this.#requests.delete(id);

		// Provide the result or error to the handler.
		if (handler) {
			handler(response);
		}
	}

	/**
	 * Sends the request to the listening server.
	 * @param request The request.
	 * @returns The response.
	 */
	async #send<TResult extends RpcResponseResult = null>(request: RpcRequestOptions): Promise<RpcResponse<TResult>> {
		const id = crypto.randomUUID();
		const { method, params, timeout } = request;

		// Initialize the response handler.
		const response = new Promise<RpcResponse<TResult>>((resolve) => {
			this.#requests.set(id, (res) => {
				clearTimeout(timeoutMonitor);
				resolve(res as RpcResponse<TResult>);
			});
		});

		// Start the timeout, and send the request.
		const timeoutMonitor = setTimeout(() => {
			this.#resolve(id, {
				ok: false,
				error: {
					code: JsonRpcErrorCode.InternalError,
					message: "The request timed out.",
				},
			});
		}, timeout);

		const accepted = await this.#proxy({ jsonrpc: "2.0", method, params, id } satisfies JsonRpcRequest);

		// When the server did not accept the request, return a 406.
		if (!accepted) {
			this.#resolve(id, {
				ok: false,
				error: {
					code: JsonRpcErrorCode.InternalError,
					message: "Failed to send request.",
				},
			});
		}

		return response;
	}
}
