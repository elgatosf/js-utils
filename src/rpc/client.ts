import type { JsonValue } from "../json.js";
import type { GatewayProxy } from "./gateway.js";
import { Request } from "./request.js";
import { Response } from "./response.js";

/**
 * Server capable of sending requests to, and receiving responses from, a server.
 */
export class Client {
	/**
	 * Proxy responsible for sending requests to a server.
	 */
	readonly #proxy: GatewayProxy;

	/**
	 * Requests with pending responses.
	 */
	readonly #requests = new Map<string, (res: Response) => void>();

	/**
	 * Initializes a new instance of the {@link Client} class.
	 * @param proxy Proxy responsible for sending requests to a server
	 */
	constructor(proxy: GatewayProxy) {
		this.#proxy = proxy;
	}

	/**
	 * Attempts to process the specified value as a response from a server.
	 * @param value Value to process.
	 * @returns `true` when the client was able to process the value as a response; otherwise `false`.
	 */
	public async receive(value: JsonValue): Promise<boolean> {
		const response = Response.parse(value);
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

		const accepted = await this.#proxy(request.toJSON());

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
