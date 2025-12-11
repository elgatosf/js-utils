import type { JsonRpcError } from "./json-rpc/error.js";
import type { JsonRpcResponse } from "./json-rpc/response.js";
import type { JsonRpcResult } from "./json-rpc/result.js";
import type { RpcResponseHandler } from "./response-handler.js";

/**
 * Response handler for a request received from a client.
 */
export class RpcRequestResponseHandler implements RpcResponseHandler {
	/**
	 * Request identifier.
	 */
	#id: string;

	/**
	 * Determines whether a response has been sent.
	 */
	#responded = false;

	/**
	 * Stream responsible for sending the response.
	 */
	#sendingStream: WritableStream<JsonRpcResponse>;

	/**
	 * Initializes a new instance of the {@link RpcRequestResponseHandler}.
	 * @param id Request identifier.
	 * @param sendingStream Stream responsible for sending the response.
	 */
	constructor(id: string, sendingStream: WritableStream<JsonRpcResponse>) {
		this.#id = id;
		this.#sendingStream = sendingStream;
	}

	/**
	 * @inheritdoc
	 */
	public get canRespond(): boolean {
		return this.#responded;
	}

	/**
	 * @inheritdoc
	 */
	public error(error: JsonRpcError): void {
		this.#send({
			jsonrpc: "2.0",
			id: this.#id,
			error,
		});
	}

	/**
	 * @inheritdoc
	 */
	public send(result: JsonRpcResult): void {
		this.#send({
			jsonrpc: "2.0",
			id: this.#id,
			result,
		});
	}

	/**
	 * Send the response to the client.
	 * @param res Response to send.
	 */
	#send(res: JsonRpcResponse): void {
		if (this.#responded) {
			throw new Error("Cannot send response as one has already been sent.");
		}

		const writer = this.#sendingStream.getWriter();
		try {
			writer.write(res);
			this.#responded = true;
		} finally {
			writer.releaseLock();
		}
	}
}
