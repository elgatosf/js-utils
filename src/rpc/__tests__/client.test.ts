import { beforeEach, describe, expect, it, vi } from "vitest";

import {
	JsonRpcErrorCode,
	JsonRpcErrorResponse,
	type JsonRpcRequest,
	type JsonRpcResponse,
	RpcClient,
	type RpcProxy,
	type RpcResponse,
} from "../index.js";

/**
 * Describes {@link RpcClient}.
 */
describe("RpcClient", () => {
	let proxy: RpcProxy;
	let client: RpcClient;

	/**
	 * Configure a mock response for requests.
	 */
	beforeEach(() => {
		proxy = vi.fn(({ id, method }: JsonRpcRequest) => {
			if (!id) {
				return true;
			}

			switch (method) {
				case "err":
					client.receive({
						jsonrpc: "2.0",
						error: {
							code: 1,
							message: "Something went wrong",
						},
						id,
					} satisfies JsonRpcResponse);
					break;
				case "test":
					client.receive({
						jsonrpc: "2.0",
						result: "Hello world",
						id,
					} satisfies JsonRpcResponse);
					break;
			}

			return true;
		}) as unknown as RpcProxy;

		client = new RpcClient(proxy);
	});

	/**
	 * Asserts invalid JSON-RPC values return an appropriate success value.
	 */
	it("ignores non JSON-RPC values", async () => {
		// Arrange, act, assert.
		const success = await client.receive("foo");
		expect(success).toBe(false);
	});

	/**
	 * Asserts notifications can be sent as method and params.
	 */
	it("sends notifications as method and params", async () => {
		// Arrange, act
		await client.notify("test", {
			name: "Elgato",
		});

		// Assert.
		expect(proxy).toHaveBeenCalledExactlyOnceWith<[JsonRpcRequest]>({
			jsonrpc: "2.0",
			method: "test",
			id: undefined,
			params: {
				name: "Elgato",
			},
		});
	});

	/**
	 * Asserts notifications can be sent as options.
	 */
	it("sends notifications as options", async () => {
		// Arrange, act
		await client.notify({
			method: "test",
			params: {
				name: "Elgato",
			},
		});

		// Assert.
		expect(proxy).toHaveBeenCalledExactlyOnceWith<[JsonRpcRequest]>({
			jsonrpc: "2.0",
			method: "test",
			id: undefined,
			params: {
				name: "Elgato",
			},
		});
	});

	/**
	 * Asserts requests can be sent as method and parameters.
	 */
	it("sends requests as method and params", async () => {
		// Arrange, act
		const res = await client.request("test", {
			name: "Elgato",
		});

		// Assert.
		expect(proxy).toHaveBeenCalledExactlyOnceWith<[JsonRpcRequest]>({
			jsonrpc: "2.0",
			method: "test",
			id: expect.any(String),
			params: {
				name: "Elgato",
			},
		});

		expect(res.ok).toBe(true);
		if (res.ok) {
			expect(res.result).toBe("Hello world");
		}
	});

	/**
	 * Asserts requests can be sent as options.
	 */
	it("sends requests as options", async () => {
		// Arrange, act
		const res = await client.request({
			method: "test",
			params: {
				name: "Elgato",
			},
		});

		// Assert.
		expect(proxy).toHaveBeenCalledExactlyOnceWith<[JsonRpcRequest]>({
			jsonrpc: "2.0",
			method: "test",
			id: expect.any(String),
			params: {
				name: "Elgato",
			},
		});

		expect(res.ok).toBe(true);
		if (res.ok) {
			expect(res.result).toBe("Hello world");
		}
	});

	/**
	 * Asserts errors are appropriately mapped from a response.
	 */
	it("maps errors", async () => {
		// Arrange, act.
		const res = await client.request("err");

		// Asserts.
		expect(res.ok).toBe(false);
		if (!res.ok) {
			expect(res.error.code).toBe(1);
			expect(res.error.message).toBe("Something went wrong");
		}
	});

	/**
	 * Asserts requests can time out.
	 */
	it("can timeout", async () => {
		const res = await client.request({
			method: "timeout",
			timeout: 1,
		});

		expect(res.ok).toBe(false);
		if (!res.ok) {
			expect(res.error.code).toBe(JsonRpcErrorCode.InternalError);
			expect(res.error.message).toBe("The request timed out.");
		}
	});

	/**
	 * Asserts an error is returned when the request could not be sent.
	 */
	it("resolves to an error when the message could not be sent", async () => {
		// Arrange.
		const client = new RpcClient(vi.fn().mockReturnValue(false));
		const res = await client.request({
			method: "timeout",
			timeout: 1,
		});

		expect(res.ok).toBe(false);
		if (!res.ok) {
			expect(res.error.code).toBe(JsonRpcErrorCode.InternalError);
			expect(res.error.message).toBe("Failed to send request.");
		}
	});

	/**
	 * Asserts unidentified responses are emitted as an event.
	 */
	it("emits unidentifiedResponse for unknown responses", async () => {
		// Arrange.
		const client = new RpcClient(vi.fn());
		const handler = vi.fn();

		// Act.
		client.on("unidentifiedResponse", handler);
		await client.receive({
			jsonrpc: "2.0",
			error: {
				code: 1,
				message: "Something went wrong",
			},
		} satisfies JsonRpcErrorResponse);

		// Assert.
		expect(handler).toHaveBeenCalledExactlyOnceWith<[RpcResponse]>({
			ok: false,
			error: {
				code: 1,
				message: "Something went wrong",
			},
		});
	});
});
