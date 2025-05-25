import type { IDisposable } from "../disposable.js";
import { EventEmitter } from "../event-emitter.js";
import type { JsonValue } from "../json.js";
import type { OutboundMessageProxy } from "./gateway.js";
import { Request } from "./request.js";
import { MessageResponder } from "./responder.js";

/**
 * Server capable of receiving message requests from, and processing responses to, a client.
 */
export class Server<TContext> {
	/**
	 * Proxy responsible for sending messages to the server.
	 */
	readonly #proxy: OutboundMessageProxy;

	/**
	 * Registered routes, and their respective handlers.
	 */
	readonly #routes = new EventEmitter();

	/**
	 * Initializes a new instance of the {@link Server} class.
	 * @param proxy Proxy responsible for sending messages to the server.
	 */
	constructor(proxy: OutboundMessageProxy) {
		this.#proxy = proxy;
	}

	/**
	 * Attempts to process the specified message received from the client.
	 * @param message Message to process.
	 * @returns `true` when the server was able to process the message; otherwise `false`.
	 */
	public async receive(message: JsonValue): Promise<boolean> {
		const request = Request.parse(message);
		if (request !== undefined) {
			if (await this.#routeRequest(request)) {
				return true;
			}
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
		options = { filter: (): boolean => true, ...options };

		return this.#routes.disposableOn(path, async ({ request, responder, resolve }: RouteResolver<TBody>) => {
			// TODO: Reintroduce context
			if (options?.filter /*&& options.filter(request.context)*/) {
				await resolve();

				try {
					// Invoke the handler; when data was returned, propagate it as part of the response (if there wasn't already a response).
					const result = await handler(request, responder);
					if (result !== undefined) {
						await responder.send(200, result);
					}
				} catch (err) {
					// Respond with an error before throwing.
					await responder.send(500);
					throw err;
				}
			}
		});
	}

	/**
	 * Handles inbound requests.
	 * @param request The request.
	 * @template TBody Type of the request's body.
	 * @returns `true` when the request was handled; otherwise `false`.
	 */
	async #routeRequest<TBody extends JsonValue>(request: Request<TBody>): Promise<boolean> {
		const responder = new MessageResponder(request, this.#proxy);

		// Get handlers of the path, and invoke them; filtering is applied by the handlers themselves
		let resolved = false;
		const routes = this.#routes.listeners(request.path) as ((ev: RouteResolver<TBody>) => Promise<void>)[];

		for (const route of routes) {
			await route({
				request,
				responder,
				resolve: async (): Promise<void> => {
					// Flags the path as handled, sending an immediate 202 if the request was unidirectional.
					if (request.unidirectional) {
						await responder.send(202);
					}

					resolved = true;
				},
			});
		}

		// The request was successfully routed, so fallback to a 200.
		if (resolved) {
			await responder.send(200);
			return true;
		}

		// When there were no applicable routes, return not-handled.
		await responder.send(501);
		return false;
	}
}

/**
 * Configuration that defines the route.
 */
export type RouteConfiguration<TContext> = {
	/**
	 * Optional filter used to determine if a message can be routed; when `true`, the route handler will be called.
	 * @param context Context associated with the message.
	 * @returns Should return `true` when the request can be handled; otherwise `false`.
	 */
	filter?: (source: TContext) => boolean;
};

/**
 * Function responsible for handling a request, and providing a response.
 * @template TContext Type of the context associated with the request.
 * @template TBody Type of the request's body.
 */
export type RouteHandler<TBody extends JsonValue = JsonValue> = (
	request: Request<TBody>,
	responder: MessageResponder<TBody>,
) => JsonValue | Promise<JsonValue | void> | void;

/**
 * Contains information about a request, and the ability to resolve it.
 */
type RouteResolver<TBody extends JsonValue> = {
	/**
	 * The request.
	 */
	request: Request<TBody>;

	/**
	 * Responder responsible for sending a response.
	 */
	responder: MessageResponder<TBody>;

	/**
	 * Resolves the request, marking it as fulfilled.
	 */
	resolve(): Promise<void>;
};
