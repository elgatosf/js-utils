import { type JsonValue } from "../json.js";
import { RpcClient, type RpcClientOptions } from "./client.js";
import type { RpcProxy } from "./proxy.js";
import { RpcServer } from "./server.js";

/**
 * Create an RPC server-and-client, capable of receiving and sending requests and notifications.
 * @param proxy Proxy capable of sending requests or responses to a client or server.
 * @param options the options.
 * @returns The RPC server-and-client.
 */
export function createRpcServerClient(proxy: RpcProxy, options?: RpcClientOptions): RpcClientServer {
	const client = new RpcClient(proxy, options);
	const server = new RpcServer(proxy);

	return {
		add: server.add,
		notify: client.notify,
		request: client.request,
		async receive(value: JsonValue): Promise<boolean> {
			return (await client.receive(value)) || (await server.receive(value));
		},
	};
}

/**
 * An RPC server-and-client, capable of receiving and sending requests and notifications.
 */
type RpcClientServer = Pick<RpcClient, "notify" | "request"> &
	Pick<RpcServer, "add"> & {
		/**
		 * Attempts to process the specified value as a request or response.
		 * @param value Value to process.
		 * @returns `true` when the value was successfully processed; otherwise `false`.
		 */
		receive(value: JsonValue): Promise<boolean>;
	};
