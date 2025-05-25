import type { JsonValue } from "../json.js";
import type { OutboundMessageProxy } from "./gateway.js";
import { isResponse, type StatusCode } from "./message.js";
import { Request } from "./request.js";
import type { ServerResponseMessage } from "./server.js";

/**
 * Client capable of sending message requests to, and processing responses from, a server.
 */
export class Client {
	/**
	 * Proxy responsible for sending messages to the server.
	 */
	readonly #proxy: OutboundMessageProxy;

	/**
	 * Requests with pending responses.
	 */
	readonly #requests = new Map<string, (res: Response) => void>();

	/**
	 * Initializes a new instance of the {@link Client} class.
	 * @param proxy Proxy responsible for sending messages to the server.
	 */
	constructor(proxy: OutboundMessageProxy) {
		this.#proxy = proxy;
	}

	/**
	 * Attempts to process the specified message received from the server.
	 * @param message Message to process.
	 * @returns `true` when the client was able to process the message; otherwise `false`.
	 */
	public async receive(message: JsonValue): Promise<boolean> {
		if (isResponse(message) && this.#resolveRequest(message)) {
			return true;
		}

		return false;
	}

	/**
	 * Sends the request to the listening server.
	 * @param request The request.
	 * @returns The response.
	 */
	public async send<T extends JsonValue, U extends JsonValue = undefined>(request: Request<T>): Promise<Response<U>> {
		const { id, path, timeout } = request;

		// Initialize the response handler.
		const response = new Promise<Response<U>>((resolve) => {
			this.#requests.set(id, (res: Response) => {
				if (res.status !== 408) {
					clearTimeout(timeoutMonitor);
				}

				resolve(res as Response<U>);
			});
		});

		// Start the timeout, and send the request.
		const timeoutMonitor = setTimeout(
			() => this.#resolveRequest({ __type: "response", id, path, status: 408 }),
			timeout,
		);

		const accepted = await this.#proxy(request);

		// When the server did not accept the request, return a 406.
		if (!accepted) {
			this.#resolveRequest({ __type: "response", id, path, status: 406 });
		}

		return response;
	}

	/**
	 * Handles inbound response.
	 * @param res The response.
	 * @returns `true` when the response was handled; otherwise `false`.
	 */
	#resolveRequest(res: ServerResponseMessage): boolean {
		const handler = this.#requests.get(res.id);
		this.#requests.delete(res.id);

		// Determine if there is a request pending a response.
		if (handler) {
			handler(new Response(res.status, res.body));
			return true;
		}

		return false;
	}
}

/**
 * Response received from the listening server.
 */
export class Response<T extends JsonValue = JsonValue> {
	/**
	 * Body of the response.
	 */
	public readonly body?: T;

	/**
	 * Status of the response.
	 * - `200` the request was successful.
	 * - `202` the request was unidirectional, and does not have a response.
	 * - `406` the request could not be accepted by the server.
	 * - `408` the request timed-out.
	 * - `500` the request failed.
	 * - `501` the request is not implemented by the server, and could not be fulfilled.
	 */
	public readonly status: StatusCode;

	/**
	 * Initializes a new instance of the {@link Response} class.
	 * @param status Status of the response.
	 * @param body Body of the response.
	 */
	constructor(status: StatusCode, body?: T) {
		this.body = body;
		this.status = status;
	}

	/**
	 * Indicates whether the request was successful.
	 * @returns `true` when the status indicates a success; otherwise `false`.
	 */
	public get ok(): boolean {
		return this.status >= 200 && this.status < 300;
	}
}
