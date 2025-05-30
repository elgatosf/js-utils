import type { JsonValue } from "../json.js";
import { JsonRpcErrorCode } from "./json-rpc/error.js";
import type { JsonRpcRequest } from "./json-rpc/request.js";
import { JsonRpcResponse } from "./json-rpc/response.js";
import type { RpcProxy } from "./proxy.js";
import { type RequestOptions, type RequestParameters } from "./request.js";
import { type Response, type ResponseResult } from "./response.js";

/**
 * Client capable of sending requests to, and receiving responses from, a server.
 */
export class Client {
	/**
	 * Proxy responsible for sending requests to a server.
	 */
	readonly #proxy: RpcProxy;

	/**
	 * Requests with pending responses.
	 */
	readonly #requests = new Map<string, (res: Response) => void>();

	/**
	 * Initializes a new instance of the {@link Client} class.
	 * @param proxy Proxy responsible for sending requests to a server
	 */
	constructor(proxy: RpcProxy) {
		this.#proxy = proxy;
	}

	/**
	 * Sends a notification to the listening server.
	 * @param method Name of the method to invoke.
	 * @param params Parameters to be used during the invocation of the method.
	 */
	public async notify(method: string, params?: RequestParameters): Promise<void>;
	/**
	 * Sends a notification to the listening server.
	 * @param request The request.
	 */
	public async notify(request: RequestOptions): Promise<void>;
	/**
	 * Sends a notification to the listening server.
	 * @param methodOrRequest The method name, or the request.
	 * @param params Parameters to be used during the invocation of the method.
	 */
	public async notify(methodOrRequest: RequestOptions | string, params?: RequestParameters): Promise<void> {
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
	 * @param method Name of the method to invoke.
	 * @param params Parameters to be used during the invocation of the method.
	 * @returns The response.
	 */
	public async request<TResult extends ResponseResult>(
		method: string,
		params?: RequestParameters,
	): Promise<Response<TResult>>;
	/**
	 * Sends the request to the listening server.
	 * @param request The request.
	 * @returns The response.
	 */
	public async request<TResult extends ResponseResult>(request: RequestOptions): Promise<Response<TResult>>;
	/**
	 * Sends the request to the listening server.
	 * @param methodOrRequest The method name, or the request.
	 * @param params Parameters to be used during the invocation of the method.
	 * @returns The response.
	 */
	public async request<TResult extends ResponseResult>(
		methodOrRequest: RequestOptions | string,
		params?: RequestParameters,
	): Promise<Response<TResult>> {
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
	#resolve(id: string | undefined, response: Response): void {
		if (id === undefined) {
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
	async #send<TParameters extends RequestParameters, TResult extends ResponseResult = null>(
		request: RequestOptions<TParameters>,
	): Promise<Response<TResult>> {
		const id = crypto.randomUUID();
		const { method, params, timeout } = request;

		// Initialize the response handler.
		const response = new Promise<Response<TResult>>((resolve) => {
			this.#requests.set(id, (res) => {
				clearTimeout(timeoutMonitor);
				resolve(res as Response<TResult>);
			});
		});

		// Start the timeout, and send the request.
		const timeoutMonitor = setTimeout(() => {
			this.#resolve(id, {
				ok: false,
				error: {
					code: -32603,
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
					message: "Failed to send request",
				},
			});
		}

		return response;
	}
}
