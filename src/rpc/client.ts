import type { JsonValue } from "../json.js";
import type { OutboundMessageProxy } from "./gateway.js";
import { Request } from "./request.js";
import { Response } from "./response.js";

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
		const response = Response.parse(message);
		if (response !== undefined && this.#resolveRequest(response)) {
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
		const timeoutMonitor = setTimeout(() => {
			this.#resolveRequest(new Response(id, path, 408, undefined));
		}, timeout);

		const accepted = await this.#proxy(request);

		// When the server did not accept the request, return a 406.
		if (!accepted) {
			this.#resolveRequest(new Response(id, path, 406, undefined));
		}

		return response;
	}

	/**
	 * Handles inbound response.
	 * @param response The response.
	 * @returns `true` when the response was handled; otherwise `false`.
	 */
	#resolveRequest(response: Response): boolean {
		const handler = this.#requests.get(response.id);
		this.#requests.delete(response.id);

		// Determine if there is a request pending a response.
		if (handler) {
			handler(response);
			return true;
		}

		return false;
	}
}
