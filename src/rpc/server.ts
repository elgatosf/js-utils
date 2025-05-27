import type { IDisposable } from "../disposable.js";
import { EventEmitter } from "../event-emitter.js";
import type { JsonValue } from "../json.js";
import type { GatewayProxy } from "./gateway.js";
import { Request } from "./request.js";
import { Responder } from "./responder.js";

/**
 * Server capable of receiving requests from, and sending responses to, a client.
 */
export class Server {
	/**
	 * Proxy responsible for sending responses to a client.
	 */
	readonly #proxy: GatewayProxy;

	/**
	 * Registered routes, and their respective handlers.
	 */
	readonly #routes = new EventEmitter();

	/**
	 * Initializes a new instance of the {@link Server} class.
	 * @param proxy Proxy responsible for sending responses to a client.
	 */
	constructor(proxy: GatewayProxy) {
		this.#proxy = proxy;
	}

	/**
	 * Attempts to process the specified request received from the client.
	 * @param value Value to process.
	 * @param contextProvider Optional context provider, provided to route handlers when responding to requests.
	 * @returns `true` when the server was able to process the request; otherwise `false`.
	 */
	public async receive<TContext = undefined>(value: JsonValue, contextProvider?: () => TContext): Promise<boolean> {
		const request = Request.parse(value);
		if (request !== undefined) {
			contextProvider ??= (): TContext => undefined!;
			if (await this.#routeRequest(request, contextProvider)) {
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
	 * @returns Disposable capable of removing the route handler.
	 */
	public route<TRequest extends JsonValue, TContext>(
		path: string,
		handler: RouteHandler<TRequest, TContext>,
		options?: RouteConfiguration<TContext>,
	): IDisposable {
		options = { filter: (): boolean => true, ...options };

		return this.#routes.disposableOn(
			path,
			async ({ context, request, responder, resolve }: RouteResolver<TRequest, TContext>) => {
				if (options?.filter && options.filter(context)) {
					await resolve();

					try {
						// Invoke the handler; when data was returned, propagate it as part of the response (if there wasn't already a response).
						const result = await handler(request, responder, context);
						if (result !== undefined) {
							await responder.send(200, result);
						}
					} catch (err) {
						// Respond with an error before throwing.
						await responder.send(500);
						throw err;
					}
				}
			},
		);
	}

	/**
	 * Handles inbound requests.
	 * @param request The request.
	 * @param contextProvider Optional context provider, provided to route handlers when responding to requests.
	 * @returns `true` when the request was handled; otherwise `false`.
	 */
	async #routeRequest<TRequest extends JsonValue, TContext>(
		request: Request<TRequest>,
		contextProvider: () => TContext,
	): Promise<boolean> {
		const responder = new Responder(request, this.#proxy);

		// Get handlers of the path, and invoke them; filtering is applied by the handlers themselves
		let resolved = false;
		const routes = this.#routes.listeners(request.path) as ((ev: RouteResolver<TRequest, TContext>) => Promise<void>)[];
		const context = contextProvider();

		for (const route of routes) {
			await route({
				context,
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
	 * Optional filter used to determine if a request can be routed; when `true`, the route handler will be called.
	 * @param context Context associated with the request.
	 * @returns Should return `true` when the request can be handled; otherwise `false`.
	 */
	filter?: (source: TContext) => boolean;
};

/**
 * Function responsible for handling a request, and providing a response.
 * @template TRequest Type of the request body.
 * @template TContext Type of the context provided to the route handler when receiving requests.
 */
export type RouteHandler<TRequest extends JsonValue = undefined, TContext = undefined> = (
	request: Request<TRequest>,
	responder: Responder<TRequest>,
	context: TContext,
) => JsonValue | Promise<JsonValue | void> | void;

/**
 * Contains information about a request, and the ability to resolve it.
 */
type RouteResolver<TBody extends JsonValue, TContext> = {
	/**
	 * Context provided to the route handler when receiving a request.
	 */
	context: TContext;

	/**
	 * The request.
	 */
	request: Request<TBody>;

	/**
	 * Responder responsible for sending a response.
	 */
	responder: Responder<TBody>;

	/**
	 * Resolves the request, marking it as fulfilled.
	 */
	resolve(): Promise<void>;
};
