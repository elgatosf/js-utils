import { describe, expect, it, vi } from "vitest";

import { JsonRpcErrorCode } from "../json-rpc/error.js";
import type { JsonRpcRequest } from "../json-rpc/request.js";
import { JsonRpcErrorResponse } from "../json-rpc/response.js";
import { Responder } from "../response.js";
import { Server } from "../server.js";

describe("RpcServer", () => {
	/**
	 * Asserts an RPC server correctly handles unexpected data structures.
	 */
	it("must not process unknown payloads", async () => {
		// Arrange.
		const proxy = vi.fn();
		const server = new Server(proxy);

		// Act.
		const result = await server.receive(true);

		// Assert.
		expect(result).toBe(false);
		expect(proxy).toHaveBeenCalledTimes(0);
	});

	/**
	 * Asserts an RPC server returns an error for unknown methods.
	 */
	it("responds with an error for unknown methods", async () => {
		// Arrange.
		const proxy = vi.fn();
		const server = new Server(proxy);

		// Act.
		await server.receive({
			jsonrpc: "2.0",
			id: "123",
			method: "test",
		} satisfies JsonRpcRequest);

		// Assert.
		expect(proxy).toHaveBeenCalledTimes(1);
		expect(proxy).toHaveBeenCalledWith<[JsonRpcErrorResponse]>({
			jsonrpc: "2.0",
			id: "123",
			error: {
				code: JsonRpcErrorCode.MethodNotFound,
				message: "The method does not exist or is not available.",
			},
		});
	});

	/**
	 * Asserts an RPC server executes route handlers in order.
	 */
	it("must execute handlers in order", async () => {
		// Arrange
		const proxy = vi.fn();
		const server = new Server(proxy);
		const order: string[] = [];
		const handlers = [
			() => {
				order.push("First");
			},
			() => {
				order.push("Second");
			},
		];

		// Act.
		server.add("/test", handlers[0]);
		server.add("/test", handlers[1]);

		await server.receive({
			jsonrpc: "2.0",
			method: "/test",
		} satisfies JsonRpcRequest);

		// Assert
		expect(order).toEqual(["First", "Second"]);
	});

	/**
	 * Asserts the disposable of a method removes the method.
	 */
	it("can remove methods", async () => {
		// Arrange.
		const proxy = vi.fn();
		const listener = vi.fn();
		const server = new Server(proxy);
		const req: JsonRpcRequest = {
			jsonrpc: "2.0",
			method: "/test",
		};

		const disposable = server.add("/test", listener);

		// Act, assert.
		await server.receive(req);
		expect(listener).toHaveBeenCalledTimes(1);

		// Act, assert (dispose).
		disposable.dispose();
		await server.receive(req);
		expect(listener).toHaveBeenCalledTimes(1); // Should still be 1.
	});

	it("provides parameters", async () => {
		// Arrange.
		const listener = vi.fn();
		const server = new Server(vi.fn());

		// Act.
		server.add("/test", ({ name }: MockParameters) => {
			listener(name);
		});

		await server.receive({
			jsonrpc: "2.0",
			method: "/test",
			params: {
				name: "Elgato",
			},
		} satisfies JsonRpcRequest);

		// Assert.
		expect(listener).toHaveBeenCalledTimes(1);
		expect(listener).toHaveBeenCalledWith("Elgato");
	});

	/**
	 * Asserts context can be provided to method.
	 */
	it("provides context to method", async () => {
		// Arrange.
		const proxy = vi.fn();
		const listener = vi.fn();
		const server = new Server(proxy);

		// Act.
		server.add("/context", listener);
		await server.receive(
			{
				jsonrpc: "2.0",
				method: "/context",
			} satisfies JsonRpcRequest,
			() => "Context",
		);

		// Assert.
		expect(listener).toHaveBeenCalledTimes(1);
		expect(listener).toHaveBeenCalledWith(undefined, expect.any(Responder), "Context");
	});
});

type MockParameters = {
	name: string;
};
