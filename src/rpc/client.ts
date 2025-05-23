import type { JsonValue } from "../json.js";
import type { OutboundMessageProxy } from "./gateway.js";
import { isResponse, type Message, type StatusCode } from "./message.js";
import type { ServerResponseMessage } from "./server.js";

// WE DON'T CARE ABOUT THE REQUEST BODY TYPE ON SENDING, REMOVE THE TYPE

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
	 * Sends the request to the listening server.
	 * @param request The request.
	 * @returns The response.
	 */
	public async fetch<T extends JsonValue = JsonValue, U extends JsonValue = JsonValue>(
		request: RequestOptions<U>,
	): Promise<Response<T>> {
		const id = crypto.randomUUID();
		const { path, body, timeout, unidirectional } = request;

		// Initialize the response handler.
		const response = new Promise<Response<T>>((resolve) => {
			this.#requests.set(id, (res: Response) => {
				if (res.status !== 408) {
					clearTimeout(timeoutMonitor);
				}

				resolve(res as Response<T>);
			});
		});

		// Start the timeout, and send the request.
		const timeoutMonitor = setTimeout(
			() => this.#resolveRequest({ __type: "response", id, path, status: 408 }),
			timeout,
		);

		const accepted = await this.#proxy({
			__type: "request",
			body,
			id,
			path,
			unidirectional: unidirectional ?? true,
		} satisfies ClientRequestMessage<U>);

		// When the server did not accept the request, return a 406.
		if (!accepted) {
			this.#resolveRequest({ __type: "response", id, path, status: 406 });
		}

		return response;
	}

	/**
	 * Attempts to process the specified message received from the server.
	 * @param message Message to process.
	 * @returns `true` when the client was able to process the message; otherwise `false`.
	 */
	public async process(message: JsonValue): Promise<boolean> {
		if (isResponse(message) && this.#resolveRequest(message)) {
			return true;
		}

		return false;
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
 * The structure of a request sent from a client, to a listening server.
 */
export type ClientRequestMessage<T extends JsonValue = JsonValue> = Message<"request", T> & {
	/**
	 * Indicates whether the request is unidirectional; when `true`, a response will not be awaited.
	 */
	readonly unidirectional: boolean;
};

/**
 * Request options associated with a request to be sent to the server.
 */
export type RequestOptions<T extends JsonValue = JsonValue> = {
	/**
	 * Body sent with the request.
	 */
	body?: T;

	/**
	 * Path of the request.
	 */
	path: string;

	/**
	 * Timeout duration in milliseconds; defaults to `5000` (5s).
	 */
	timeout?: number;

	/**
	 * Indicates whether the request is unidirectional; when `true`, a response will not be awaited.
	 */
	unidirectional?: boolean;
};

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
