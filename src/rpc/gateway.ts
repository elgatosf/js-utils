import type { IDisposable } from "../disposable.js";
import { type JsonValue } from "../json.js";
import { Client } from "./client.js";
import { Request, type RequestOptions } from "./request.js";
import { Response } from "./response.js";
import { type RouteConfiguration, type RouteHandler, Server } from "./server.js";

/**
 * Provides a gateway between to clients and a server, enabling them to send/receive requests/responses.
 */
export class Gateway {
	/**
	 * Server responsible for receiving requests, and sending responses.
	 */
	readonly #server: Server;

	/**
	 * Client response for sending requests, and receiving responses.
	 */
	readonly #client: Client;

	/**
	 * Initializes a new instance of the {@link Gateway} class.
	 * @param proxy Proxy capable of sending requests or responses to a client or server.
	 */
	constructor(proxy: GatewayProxy) {
		this.#client = new Client(proxy);
		this.#server = new Server(proxy);
	}

	/**
	 * Attempts to process the specified value as a request or response.
	 * @param value Value to process.
	 * @param contextProvider Optional context provider, provided to route handlers when responding to requests.
	 * @template TContext Type of the context provided to the route handler when receiving requests.
	 * @returns `true` when the value was successfully processed; otherwise `false`.
	 */
	public async receive<TContext = unknown>(value: JsonValue, contextProvider?: () => TContext): Promise<boolean> {
		if (await this.#client.receive(value)) {
			return true;
		}

		if (await this.#server.receive(value, contextProvider)) {
			return true;
		}

		return false;
	}

	/**
	 * Maps the specified path to the handler, allowing for requests from the client.
	 * @param path Path used to identify the route.
	 * @param handler Handler to be invoked when the request is received.
	 * @param options Optional routing configuration.
	 * @template TRequest Type of the request body.
	 * @template TContext Type of the context provided to the route handler when receiving requests.
	 * @returns Disposable capable of removing the route handler.
	 */
	public route<TRequest extends JsonValue = undefined, TContext = undefined>(
		path: string,
		handler: RouteHandler<TRequest, TContext>,
		options?: RouteConfiguration<TContext>,
	): IDisposable {
		return this.#server.route<TRequest, TContext>(path, handler, options);
	}

	/**
	 * Sends the request to the listening server.
	 * @param path Path of the request.
	 * @param body Optional body sent with the request.
	 * @template T Type of the response body.
	 * @returns The response.
	 */
	public async send<T extends JsonValue>(path: string, body?: JsonValue): Promise<Response<T>>;
	/**
	 * Sends the request to the listening server.
	 * @param request The request.
	 * @template T Type of the response body.
	 * @returns The response.
	 */
	public async send<T extends JsonValue = undefined>(request: RequestOptions): Promise<Response<T>>;
	/**
	 * Sends the request to the listening server.
	 * @param requestOrPath The request, or the path of the request.
	 * @param bodyOrUndefined Request body, or moot when constructing the request with {@link RequestOptions}.
	 * @template T Type of the response body.
	 * @returns The response.
	 */
	public async send<T extends JsonValue = undefined>(
		requestOrPath: RequestOptions | string,
		bodyOrUndefined?: JsonValue,
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
}

/**
 * Proxy capable of sending requests or responses to a client or server.
 * @param value Request or response to send.
 * @returns `true` when the proxy was able to send the value; otherwise `false`.
 */
export type GatewayProxy = (value: JsonValue) => Promise<boolean> | boolean;
