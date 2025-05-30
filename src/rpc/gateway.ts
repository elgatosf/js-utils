import { type JsonValue } from "../json.js";
import { Client } from "./client.js";
import type { RpcProxy } from "./proxy.js";
import { Server } from "./server.js";

/**
 * Acts as an RPC client and a server, allowing for outbound and inbound requests and responses.
 */
export class Gateway {
	/**
	 * Client response for sending requests, and receiving responses.
	 */
	public readonly client: Client;

	/**
	 * Server responsible for receiving requests, and sending responses.
	 */
	public readonly server: Server;

	/**
	 * Initializes a new instance of the {@link Gateway} class.
	 * @param proxy Proxy capable of sending requests or responses to a client or server.
	 */
	constructor(proxy: RpcProxy) {
		this.client = new Client(proxy);
		this.server = new Server(proxy);
	}

	/**
	 * Attempts to process the specified value as a request or response.
	 * @param value Value to process.
	 * @param contextProvider Optional context provider, provided to route handlers when responding to requests.
	 * @template TContext Type of the context provided to the route handler when receiving requests.
	 * @returns `true` when the value was successfully processed; otherwise `false`.
	 */
	public async receive<TContext = unknown>(value: JsonValue, contextProvider?: () => TContext): Promise<boolean> {
		if (await this.client.receive(value)) {
			return true;
		}

		if (await this.server.receive(value, contextProvider)) {
			return true;
		}

		return false;
	}
}
