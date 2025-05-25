import type { JsonValue } from "../json.js";
import type { OutboundMessageProxy } from "./gateway.js";
import type { Request } from "./request.js";
import { Response } from "./response.js";
import type { StatusCode } from "./status.js";

/**
 * Message responder responsible for responding to a request.
 */
export class MessageResponder<TBody extends JsonValue> {
	/**
	 * Proxy responsible for forwarding the response to the client.
	 */
	readonly #proxy: OutboundMessageProxy;

	/**
	 * The request the response is associated with.
	 */
	readonly #request: Request<TBody>;

	/**
	 * Indicates whether a response has already been sent in relation to the response.
	 */
	#responded = false;

	/**
	 * Initializes a new instance of the {@link MessageResponder} class.
	 * @param request The request the response is associated with.
	 * @param proxy Proxy responsible for forwarding the response to the client.
	 */
	constructor(request: Request<TBody>, proxy: OutboundMessageProxy) {
		this.#request = request;
		this.#proxy = proxy;
	}

	/**
	 * Indicates whether a response can be sent.
	 * @returns `true` when a response has not yet been set.
	 */
	public get canRespond(): boolean {
		return !this.#responded;
	}

	/**
	 * Sends a failure response with a status code of `500`.
	 * @param body Optional response body.
	 * @returns Promise fulfilled once the response has been sent.
	 */
	public fail(body?: JsonValue): Promise<void> {
		return this.send(500, body);
	}

	/**
	 * Sends the {@link body} as a response with the {@link status}
	 * @param status Response status.
	 * @param body Optional response body.
	 * @returns Promise fulfilled once the response has been sent.
	 */
	public async send(status: StatusCode, body?: JsonValue): Promise<void> {
		if (this.canRespond) {
			const res = new Response(this.#request.id, this.#request.path, status, body);

			await this.#proxy(res);
			this.#responded = true;
		}
	}

	/**
	 * Sends a success response with a status code of `200`.
	 * @param body Optional response body.
	 * @returns Promise fulfilled once the response has been sent.
	 */
	public success(body?: JsonValue): Promise<void> {
		return this.send(200, body);
	}
}
