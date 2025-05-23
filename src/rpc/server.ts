import type { IDisposable } from "../disposable.js";
import { EventEmitter } from "../event-emitter.js";
import type { JsonValue } from "../json.js";
import type { ClientRequestMessage } from "./client.js";
import type { OutboundMessageProxy } from "./gateway.js";
import { isRequest, type Message, type StatusCode } from "./message.js";
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
	 * @param contextProvider Function responsible for providing the context of the request.
	 * @returns `true` when the server was able to process the message; otherwise `false`.
	 */
	public async process(message: JsonValue, contextProvider: () => TContext): Promise<boolean> {
		if (isRequest(message)) {
			if (await this.#routeRequest(message, contextProvider())) {
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
		handler: RouteHandler<TContext, TBody>,
		options?: RouteConfiguration<TContext>,
	): IDisposable {
		options = { filter: (): boolean => true, ...options };

		return this.#routes.disposableOn(path, async ({ request, responder, resolve }: RouteResolver<TContext, TBody>) => {
			if (options?.filter && options.filter(request.context)) {
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
	 * @param req The request.
	 * @param context Context associated with the request.
	 * @template TBody Type of the request's body.
	 * @returns `true` when the request was handled; otherwise `false`.
	 */
	async #routeRequest<TBody extends JsonValue>(req: ClientRequestMessage<TBody>, context: TContext): Promise<boolean> {
		const responder = new MessageResponder(req, this.#proxy);
		const request = new Request(req, context);

		// Get handlers of the path, and invoke them; filtering is applied by the handlers themselves
		let resolved = false;
		const routes = this.#routes.listeners(req.path) as ((ev: RouteResolver<TContext, TBody>) => Promise<void>)[];

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
 * Request received from a client.
 * @template TBody Type of the request's body.
 */
export class Request<TBody extends JsonValue, TContext> {
	/**
	 * Context associated with the request.
	 */
	public readonly context: TContext;

	/**
	 * Source of the request.
	 */
	readonly #request: ClientRequestMessage<TBody>;

	/**
	 * Initializes a new instance of the {@link Request} class.
	 * @param request Source of the request.
	 * @param context Context associated with the request.
	 */
	constructor(request: ClientRequestMessage<TBody>, context: TContext) {
		this.context = context;
		this.#request = request;
	}

	/**
	 * Body of the request.
	 * @returns The value.
	 */
	public get body(): TBody | undefined {
		return this.#request.body;
	}

	/**
	 * Indicates whether the request is unidirectional; when `true`, a response will not be awaited.
	 * @returns The value.
	 */
	public get unidirectional(): boolean {
		return this.#request.unidirectional;
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
export type RouteHandler<TContext, TBody extends JsonValue = JsonValue> = (
	request: Request<TBody, TContext>,
	responder: MessageResponder,
) => JsonValue | Promise<JsonValue | void> | void;

/**
 * Contains information about a request, and the ability to resolve it.
 */
type RouteResolver<TContext, TBody extends JsonValue> = {
	/**
	 * The request.
	 */
	request: Request<TBody, TContext>;

	/**
	 * Responder responsible for sending a response.
	 */
	responder: MessageResponder;

	/**
	 * Resolves the request, marking it as fulfilled.
	 */
	resolve(): Promise<void>;
};

/**
 * Response message sent from the server.
 */
export type ServerResponseMessage = Message<"response", JsonValue> & {
	/**
	 * Code that indicates the response status.
	 * - `200` the request was successful.
	 * - `202` the request was unidirectional, and does not have a response.
	 * - `406` the request could not be accepted by the server.
	 * - `408` the request timed-out.
	 * - `500` the request failed.
	 * - `501` the request is not implemented by the server, and could not be fulfilled.
	 */
	readonly status: StatusCode;
};
