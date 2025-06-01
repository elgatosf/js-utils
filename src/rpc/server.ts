import { deferredDisposable, type IDisposable } from "../disposable.js";
import type { JsonValue } from "../json.js";
import { JsonRpcErrorCode } from "./json-rpc/error.js";
import { JsonRpcRequest } from "./json-rpc/request.js";
import type { RpcProxy } from "./proxy.js";
import type { RpcRequestParameters } from "./request.js";
import { RpcRequestResponder, type RpcResponseResult } from "./response.js";

/**
 * Server capable of receiving requests from, and sending responses to, a client.
 */
export class RpcServer {
	/**
	 * Proxy responsible for sending responses to a client.
	 */
	readonly #proxy: RpcProxy;

	/**
	 * Registered methods, and their respective handlers.
	 */
	readonly #methods = new Map<string, MethodHandler>();

	/**
	 * Initializes a new instance of the {@link RpcServer} class.
	 * @param proxy Proxy responsible for sending responses to a client.
	 */
	constructor(proxy: RpcProxy) {
		this.#proxy = proxy;
	}

	/**
	 * Maps the specified method name to a method, allowing for requests from a client.
	 * @param name Name of the method.
	 * @param handler Handler to be invoked when the request is received.
	 * @returns Disposable capable of removing the handler.
	 */
	public add<TParameters extends RpcRequestParameters, TContext>(
		name: string,
		handler: MethodHandler<TParameters, TContext>,
	): IDisposable {
		if (this.#methods.has(name)) {
			throw new Error(`Method already exists: ${name}`);
		}

		this.#methods.set(name, handler as MethodHandler);
		return deferredDisposable(() => this.#methods.delete(name));
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

		const responder = new RpcRequestResponder(this.#proxy, request.id);
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
	async #route<TParameters extends RpcRequestParameters, TContext>(
		request: JsonRpcRequest,
		responder: RpcRequestResponder,
		contextProvider: () => TContext,
	): Promise<boolean> {
		const handler = this.#methods.get(request.method) as MethodHandler<TParameters, TContext> | undefined;
		if (handler === undefined) {
			return false;
		}

		try {
			// Invoke the handler; when data was returned, propagate it as part of the response (if there wasn't already a response).
			const result = await handler(request.params as unknown as TParameters, responder, contextProvider());
			if (result === undefined) {
				await responder.success(null);
			} else {
				await responder.success(result);
			}
		} catch (err) {
			// Respond with an error before throwing.
			await responder.error({
				code: JsonRpcErrorCode.InternalError,
				message: err instanceof Error ? err.message : err instanceof Object ? err.toString() : "Unknown error",
			});

			throw err;
		}

		return true;
	}
}

/**
 * Function responsible for handling a request, and providing a result.
 * @template TParameters Type of the parameter sent with the request.
 * @template TContext Type of the context provided to the method handler when receiving requests.
 */
export type MethodHandler<TParameters extends RpcRequestParameters = undefined, TContext = undefined> = (
	parameters: TParameters,
	responder: RpcRequestResponder,
	context: TContext,
) => Promise<RpcResponseResult | void> | RpcResponseResult | void;
