import type { IDisposable } from "../disposable.js";
import type { JsonValue } from "../json.js";
import { Client, type RequestOptions, Response } from "./client.js";
import { type RouteConfiguration, type RouteHandler, Server } from "./server.js";

/**
 * The default request options.
 */
const DEFAULT_REQUEST_OPTIONS = {
	timeout: 5000,
	unidirectional: false,
};

/**
 * Provides a gateway between to entities that are capable of sending and receiving messages in the
 * as requests and responses.
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
		const getRequestOptions = (): RequestOptions<U> => {
			if (typeof requestOrPath === "string") {
				return {
					...DEFAULT_REQUEST_OPTIONS,
					path: requestOrPath,
					body: bodyOrUndefined,
				};
			}

			return {
				...DEFAULT_REQUEST_OPTIONS,
				...requestOrPath,
			};
		};

		return this.#client.fetch(getRequestOptions());
	}

	/**
	 * Attempts to process the specified message.
	 * @param message Message to process.
	 * @param contextProvider Function responsible for providing the context of the request.
	 * @returns `true` when the message was successfully processed; otherwise `false`.
	 */
	public async process(message: JsonValue, contextProvider: () => TContext): Promise<boolean> {
		if (await this.#client.process(message)) {
			return true;
		}

		if (await this.#server.process(message, contextProvider)) {
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
		handler: RouteHandler<TContext, TBody>,
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
export type OutboundMessageProxy = (payload: JsonValue) => Promise<boolean> | boolean;
