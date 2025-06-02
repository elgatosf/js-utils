import type { JsonObject, JsonPrimitive, JsonValue } from "../json.js";
import type { JsonRpcError } from "./json-rpc/error.js";
import type { JsonRpcResponse } from "./json-rpc/response.js";
import type { RpcProxy } from "./proxy.js";

/**
 * Response object sent from a server.
 */
export type RpcResponse<T extends RpcResponseResult = RpcResponseResult> =
	| {
			/**
			 * Result of the request.
			 */
			readonly result: T;

			/**
			 * Determines whether the request was successful.
			 */
			readonly ok: true;
	  }
	| {
			/**
			 * The error that occurred.
			 */
			readonly error: JsonRpcError;

			/**
			 * Determines whether the request was successful.
			 */
			readonly ok: false;
	  };

/**
 * Type of a result contained within a response.
 */
export type RpcResponseResult = Exclude<JsonPrimitive, undefined> | JsonObject | JsonValue[];

/**
 * Responder responsible for responding to a request.
 */
export class RpcRequestResponder {
	/**
	 * Identifier of the request.
	 */
	readonly #id: string | undefined;

	/**
	 * Proxy responsible for sending the response to the client.
	 */
	readonly #proxy: RpcProxy;

	/**
	 * Indicates whether a response has already been sent in relation to the response.
	 */
	#responded = false;

	/**
	 * Initializes a new instance of the {@link RpcRequestResponder} class.
	 * @param proxy Proxy responsible for forwarding the response to the client.
	 * @param id Identifier of the request.
	 */
	constructor(proxy: RpcProxy, id: string | undefined) {
		this.#proxy = proxy;
		this.#id = id;
	}

	/**
	 * Indicates whether a response can be sent.
	 * @returns `true` when a response has not yet been set and the request accepts responses.
	 */
	public get canRespond(): boolean {
		return !this.#responded && this.#id !== undefined;
	}

	/**
	 * Sends an error response to the client.
	 * @param error The error.
	 * @returns Promise fulfilled once the response has been sent.
	 */
	public error(error: JsonRpcError): Promise<void> {
		return this.#send({
			jsonrpc: "2.0",
			id: this.#id,
			error,
		});
	}

	/**
	 * Sends the result to the client.
	 * @param result The result.
	 * @returns Promise fulfilled once the response has been sent.
	 */
	public async success(result: RpcResponseResult): Promise<void> {
		if (this.#id) {
			await this.#send({
				jsonrpc: "2.0",
				id: this.#id,
				result,
			});
		}
	}

	/**
	 * Sends the response to the client.
	 * @param res The response.
	 */
	async #send(res: JsonRpcResponse): Promise<void> {
		if (!this.#responded) {
			await this.#proxy(res);
			this.#responded = true;
		}
	}
}
