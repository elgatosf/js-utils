import type { IDisposable } from "../disposable.js";
import type { JsonValue } from "../json.js";
import { Client, Response } from "./client.js";
import { Request, type RequestOptions } from "./request.js";
import { type RouteConfiguration, type RouteHandler, Server } from "./server.js";

/**
 * Provides a gateway between to clients and a server, enabling them to send/receive requests/responses.
 */
export class MessageGateway<TContext> {
	/**
	 * Server responsible for processing requests, and returning responses.
	 */
	readonly #server: Server<TContext>;

	/**
	 * Client response for sending requests, and processing responses.
	 */
	readonly #client: Client;

	/**
	 * Initializes a new instance of the {@link MessageGateway} class.
	 * @param proxy Proxy responsible for sending messages between the two entities.
	 */
	constructor(proxy: OutboundMessageProxy) {
		this.#client = new Client(proxy);
		this.#server = new Server(proxy);
	}

	/**
	 * Sends the request to the listening server.
	 * @param request The request.
	 * @returns The response.
	 */
	public async fetch<T extends JsonValue = JsonValue, U extends JsonValue = JsonValue>(
		request: RequestOptions<U>,
	): Promise<Response<T>>;
	/**
	 * Sends the request to the listening server.
	 * @param path Path of the request.
	 * @param body Optional body sent with the request.
	 * @returns The response.
	 */
	public async fetch<TResponseBody extends JsonValue = JsonValue, U extends JsonValue = JsonValue>(
		path: string,
		body?: U,
	): Promise<Response<TResponseBody>>;
	/**
	 * Sends the request to the listening server.
	 * @param requestOrPath The request, or the path of the request.
	 * @param bodyOrUndefined Request body, or moot when constructing the request with {@link RequestOptions}.
	 * @returns The response.
	 */
	public async fetch<T extends JsonValue = JsonValue, U extends JsonValue = JsonValue>(
		requestOrPath: RequestOptions<U> | string,
		bodyOrUndefined?: U,
	): Promise<Response<T>> {
		if (typeof requestOrPath === "string") {
			return this.#client.send(
				new Request({
					path: requestOrPath,
					body: bodyOrUndefined,
				}),
			);
		} else {
			return this.#client.send(new Request(requestOrPath));
		}
	}

	/**
	 * Attempts to process the specified message.
	 * @param message Message to process.
	 * @returns `true` when the message was successfully processed; otherwise `false`.
	 */
	public async process(message: JsonValue): Promise<boolean> {
		if (await this.#client.receive(message)) {
			return true;
		}

		if (await this.#server.receive(message)) {
			return true;
		}

		return false;
	}

	/**
	 * Maps the specified path to the handler, allowing for requests from the client.
	 * @param path Path used to identify the route.
	 * @param handler Handler to be invoked when the request is received.
	 * @param options Optional routing configuration.
	 * @template TBody Type of the request's body.
	 * @returns Disposable capable of removing the route handler.
	 */
	public route<TBody extends JsonValue = JsonValue>(
		path: string,
		handler: RouteHandler<TBody>,
		options?: RouteConfiguration<TContext>,
	): IDisposable {
		return this.#server.route(path, handler, options);
	}
}

/**
 * Proxy capable of sending a payload to the plugin / property inspector.
 * @param payload Payload to be sent to the server.
 * @returns `true` when the server was able to accept the response; otherwise `false`.
 */
export type OutboundMessageProxy = (payload: JsonValue | Request<JsonValue | undefined>) => Promise<boolean> | boolean;
