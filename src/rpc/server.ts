import type { IDisposable } from "../disposable.js";
import { EventEmitter } from "../event-emitter.js";
import type { JsonValue } from "../json.js";
import { JsonRpcErrorCode } from "./json-rpc/error.js";
import { JsonRpcRequest } from "./json-rpc/request.js";
import type { RpcProxy } from "./proxy.js";
import type { RequestParameters } from "./request.js";
import { Responder, type ResponseResult } from "./response.js";

/**
 * Server capable of receiving requests from, and sending responses to, a client.
 */
export class Server {
	/**
	 * Proxy responsible for sending responses to a client.
	 */
	readonly #proxy: RpcProxy;

	/**
	 * Registered methods, and their respective handlers.
	 */
	readonly #methods = new EventEmitter();

	/**
	 * Initializes a new instance of the {@link Server} class.
	 * @param proxy Proxy responsible for sending responses to a client.
	 */
	constructor(proxy: RpcProxy) {
		this.#proxy = proxy;
	}

	/**
	 * Maps the specified method name to a method, allowing for requests from a client.
	 * @param name Name of the method.
	 * @param handler Handler to be invoked when the request is received.
	 * @param options Optional configuration.
	 * @returns Disposable capable of removing the handler.
	 */
	public add<TParameters extends RequestParameters, TContext>(
		name: string,
		handler: MethodHandler<TParameters, TContext>,
		options?: MethodConfiguration<TContext>,
	): IDisposable {
		options = { filter: (): boolean => true, ...options };

		return this.#methods.disposableOn(
			name,
			async ({ context, parameters, responder, resolve }: RequestResolver<TParameters, TContext>) => {
				if (options?.filter && options.filter(context)) {
					resolve();

					try {
						// Invoke the handler; when data was returned, propagate it as part of the response (if there wasn't already a response).
						const result = await handler(parameters, responder, context);
						if (result !== undefined) {
							await responder.success(result);
						}
					} catch (err) {
						// Respond with an error before throwing.
						await responder.error({
							code: JsonRpcErrorCode.InternalError,
							message: err instanceof Object ? err.toString() : "Unknown error",
						});

						throw err;
					}
				}
			},
		);
	}

	/**
	 * Attempts to process the specified request received from a client.
	 * @param value Value to process.
	 * @param contextProvider Optional context provider, provided to the handlers when responding to requests.
	 * @returns `true` when the server was able to process the request; otherwise `false`.
	 */
	public async receive<TContext = undefined>(value: JsonValue, contextProvider?: () => TContext): Promise<boolean> {
		const { success, data: request } = JsonRpcRequest.safeParse(value);
		if (!success) {
			return false;
		}

		const responder = new Responder(this.#proxy, request.id);
		contextProvider ??= (): TContext => undefined!;

		if (await this.#route(request, responder, contextProvider)) {
			return true;
		} else {
			await responder.error({
				code: JsonRpcErrorCode.MethodNotFound,
				message: "The method does not exist or is not available.",
			});
		}

		return false;
	}

	/**
	 * Handles inbound requests.
	 * @param request The request.
	 * @param responder The responder responsible for responding to the client.
	 * @param contextProvider Optional context provider, provided to handlers when responding to requests.
	 * @returns `true` when the request was handled; otherwise `false`.
	 */
	async #route<TParameters extends RequestParameters, TContext>(
		request: JsonRpcRequest,
		responder: Responder,
		contextProvider: () => TContext,
	): Promise<boolean> {
		let routed = false;

		// Get handlers of the path, and invoke them; filtering is applied by the handlers themselves
		const context = contextProvider();
		const methods = this.#methods.listeners(request.method) as ((
			ev: RequestResolver<TParameters, TContext>,
		) => Promise<void>)[];

		for (const method of methods) {
			await method({
				context,
				parameters: request.params as unknown as TParameters,
				responder,
				resolve: (): void => {
					routed = true;
				},
			});
		}

		// The request was successfully routed.
		if (routed) {
			await responder.success(null);
			return true;
		}

		return false;
	}
}

/**
 * Configuration that defines the method.
 */
export type MethodConfiguration<TContext> = {
	/**
	 * Optional filter used to determine if a request can be routed; when `true`, the handler will be called.
	 * @param context Context associated with the request.
	 * @returns Should return `true` when the request can be handled; otherwise `false`.
	 */
	filter?: (context: TContext) => boolean;
};

/**
 * Function responsible for handling a request, and providing a result.
 * @template TParameters Type of the parameter sent with the request.
 * @template TContext Type of the context provided to the method handler when receiving requests.
 */
export type MethodHandler<TParameters extends RequestParameters = undefined, TContext = undefined> = (
	parameters: TParameters,
	responder: Responder,
	context: TContext,
) => Promise<ResponseResult | void> | ResponseResult | void;

/**
 * Contains information about a request, and the ability to resolve it.
 */
type RequestResolver<TParameters extends RequestParameters, TContext> = {
	/**
	 * Optional context provided to the handler when receiving a request.
	 */
	context: TContext;

	/**
	 * The request parameters.
	 */
	parameters: TParameters;

	/**
	 * Responder responsible for sending a response.
	 */
	responder: Responder;

	/**
	 * Resolves the request, marking it as fulfilled.
	 */
	resolve(): void;
};
