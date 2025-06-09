import { type IDisposable } from "../disposable.js";
import { EventEmitter } from "../event-emitter.js";
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
	 * Registered methods, and their respective handlers.
	 */
	readonly #methods = new EventEmitter<RpcServerMethodsEventMap>();

	/**
	 * Proxy responsible for sending responses to a client.
	 */
	readonly #proxy: RpcProxy;

	/**
	 * Initializes a new instance of the {@link RpcServer} class.
	 * @param proxy Proxy responsible for sending responses to a client.
	 */
	constructor(proxy: RpcProxy) {
		this.#proxy = proxy;
	}

	/**
	 * Maps a method handler, allowing the server to receive requests or notifications.
	 * @param name The name of the method to be mapped.
	 * @param handler The handler function to be invoked when the method is called.
	 * @returns A disposable object that can be used to remove the method handler.
	 */
	public add<TParameters extends RpcRequestParameters>(name: string, handler: MethodHandler<TParameters>): IDisposable {
		return this.#methods.disposableOn(name, handler as MethodHandler);
	}

	/**
	 * Attempts to process the specified request received from a client.
	 * @param value Value to process.
	 * @returns `true` when the server was able to process the request; otherwise `false`.
	 */
	public async receive(value: JsonValue): Promise<boolean> {
		const { success, data: request } = JsonRpcRequest.safeParse(value);
		if (!success) {
			return false;
		}

		const responder = new RpcRequestResponder(this.#proxy, request.id);
		const methods = this.#methods.listeners(request.method);

		if (methods.length === 0) {
			await responder.error({
				code: JsonRpcErrorCode.MethodNotFound,
				message: "The method does not exist or is not available.",
			});

			return false;
		}

		await this.#invoke(methods, request.params, responder);
		return true;
	}

	/**
	 * Invokes the specified methods with the request information and attempts to return a response.
	 * @param methods Chain of methods.
	 * @param parameters Parameters provided with the request.
	 * @param responder Request responder responsible for sending a response.
	 */
	async #invoke(
		methods: MethodHandler[],
		parameters: RpcRequestParameters,
		responder: RpcRequestResponder,
	): Promise<void> {
		// `next` function used to chain methods.
		const next = (methods: MethodHandler[]) => {
			return (): ReturnType<MethodHandler> => {
				const [curr, ...rest] = methods;
				if (curr === undefined) {
					return null;
				}

				return curr(parameters as undefined, responder, next(rest));
			};
		};

		try {
			// Execute the first method.
			const result = await next(methods)();
			await responder.success(result ?? null);
		} catch (err) {
			// Respond with an error before throwing.
			await responder.error({
				code: JsonRpcErrorCode.InternalError,
				message: err instanceof Error ? err.message : err instanceof Object ? err.toString() : "Unknown error",
			});

			throw err;
		}
	}
}

/**
 * Event map for methods the server is responsible for.
 */
type RpcServerMethodsEventMap = {
	[name: string]: [...Parameters<MethodHandler>];
};

/**
 * Function responsible for handling a request, and providing a result.
 * @template TParameters Type of the parameter sent with the request.
 */
export type MethodHandler<TParameters extends RpcRequestParameters = undefined> = (
	parameters: TParameters,
	responder: RpcRequestResponder,
	next: () => Promise<RpcResponseResult | void> | RpcResponseResult | void,
) => Promise<RpcResponseResult | void> | RpcResponseResult | void;
