import { EventEmitter } from "../event-emitter.js";
import type { IDisposable } from "../explicit-resource-management/disposable.js";
import { JsonRpcErrorCode } from "./json-rpc/error-code.js";
import type { JsonRpcParameters } from "./json-rpc/parameters.js";
import type { RpcMethodHandler } from "./method-handler.js";
import type { RpcResponseHandler } from "./response-handler.js";

/**
 * Dispatcher responsible for routing inbound requests to method handlers.
 */
export class RpcMethodDispatcher {
	/**
	 * Methods registered with the dispatcher.
	 */
	readonly #methods = new EventEmitter<MethodDispatcherEventMap>();

	/**
	 * Adds a local method handler that will be called when the method is dispatched.
	 * @param method Method name.
	 * @param handler The handler to add.
	 * @returns Disposable used to remove the handler.
	 */
	public add(method: string, handler: RpcMethodHandler): IDisposable {
		return this.#methods.disposableOn(method, handler);
	}

	/**
	 * Dispatches the method, calling all handlers associated with it.
	 *
	 * When no handlers are associated with the method, an error response is sent to the client.
	 * @param method Method name.
	 * @param params Request parameters.
	 * @param response Response handler.
	 */
	public async dispatch(method: string, params: JsonRpcParameters, response: RpcResponseHandler): Promise<void> {
		const methods = this.#methods.listeners(method);
		if (methods.length === 0) {
			await this.#invoke(methods, params, response);
		} else {
			response.error({
				code: JsonRpcErrorCode.MethodNotFound,
				message: `No method handlers found for: ${method}`,
			});
		}
	}

	/**
	 * Invokes the specified methods with the request information, and send the result to the response.
	 * @param methods Methods to invoke.
	 * @param params Request parameters.
	 * @param response Response handler.
	 */
	async #invoke(methods: RpcMethodHandler[], params: JsonRpcParameters, response: RpcResponseHandler): Promise<void> {
		// `next` function used to chain methods.
		const next = (methods: RpcMethodHandler[]) => {
			return (): ReturnType<RpcMethodHandler> => {
				const [curr, ...rest] = methods;
				if (curr === undefined) {
					return null;
				}

				return curr(params, response, next(rest));
			};
		};

		try {
			// Execute the method handler-chain, and return the result.
			const result = await next(methods)();
			if (response.canRespond) {
				response.send(result ?? null);
			}
		} catch (err) {
			// Respond with the error.
			response.error({
				code: JsonRpcErrorCode.InternalError,
				data: JSON.parse(JSON.stringify(err)),
				message: err instanceof Error ? err.message : err instanceof Object ? err.toString() : "Unknown error",
			});
		}
	}
}

/**
 * Event map for methods registered with a dispatcher.
 */
interface MethodDispatcherEventMap {
	[method: string]: [...Parameters<RpcMethodHandler>];
}
