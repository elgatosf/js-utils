import { describe, expect, it, vi } from "vitest";

import {
	JsonRpcErrorCode,
	type JsonRpcErrorResponse,
	type JsonRpcRequest,
	type JsonRpcResponse,
	RpcRequestResponder,
	RpcServer,
} from "../index.js";

/**
 * Describes {@link RpcServer}.
 */
describe("RpcServer", () => {
	/**
	 * Asserts an server correctly handles unexpected data structures.
	 */
	it("ignores unknown payloads", async () => {
		// Arrange.
		const proxy = vi.fn();
		const server = new RpcServer(proxy);

		// Act.
		const result = await server.receive(true);

		// Assert.
		expect(result).toBe(false);
		expect(proxy).toHaveBeenCalledTimes(0);
	});

	/**
	 * Asserts an server returns an error for unknown methods.
	 */
	it("responds with an error for unknown methods", async () => {
		// Arrange.
		const proxy = vi.fn();
		const server = new RpcServer(proxy);

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
	 * Asserts methods are unique by name.
	 */
	it("methods are unique", () => {
		// Arrange.
		const server = new RpcServer(vi.fn());

		// Act, assert.
		server.add("test", vi.fn());
		expect(() => server.add("test", vi.fn())).toThrowError(`Method already exists: test`);
	});

	/**
	 * Asserts the disposable of a method removes the method.
	 */
	it("can remove methods", async () => {
		// Arrange.
		const proxy = vi.fn();
		const listener = vi.fn();
		const server = new RpcServer(proxy);
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

	/**
	 * Asserts the server provides the parameters from the request.
	 */
	it("provides parameters", async () => {
		// Arrange.
		const listener = vi.fn();
		const server = new RpcServer(vi.fn());

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
	it("provides context", async () => {
		// Arrange.
		const proxy = vi.fn();
		const listener = vi.fn();
		const server = new RpcServer(proxy);

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
		expect(listener).toHaveBeenCalledWith(undefined, expect.any(RpcRequestResponder), "Context");
	});

	/**
	 * Asserts the server returns the result of the handler.
	 */
	it("returns the result", async () => {
		// Arrange.
		const proxy = vi.fn();
		const server = new RpcServer(proxy);

		// Act.
		server.add("test", () => "Hello world");
		await server.receive({
			jsonrpc: "2.0",
			method: "test",
			id: "123",
		} satisfies JsonRpcRequest);

		// Assert
		expect(proxy).toHaveBeenCalledTimes(1);
		expect(proxy).toHaveBeenCalledWith<[JsonRpcResponse]>({
			jsonrpc: "2.0",
			id: "123",
			result: "Hello world",
		});
	});

	/**
	 * Asserts the server returns null result for method handlers that have no result.
	 */
	it("returns null when no result", async () => {
		// Arrange.
		const proxy = vi.fn();
		const server = new RpcServer(proxy);

		// Act.
		server.add("test", () => {
			/* no result */
		});
		await server.receive({
			jsonrpc: "2.0",
			method: "test",
			id: "123",
		} satisfies JsonRpcRequest);

		// Assert
		expect(proxy).toHaveBeenCalledTimes(1);
		expect(proxy).toHaveBeenCalledWith<[JsonRpcResponse]>({
			jsonrpc: "2.0",
			id: "123",
			result: null,
		});
	});

	/**
	 * Asserts the server returns an error for thrown errors
	 */
	it("returns an error for thrown errors", async () => {
		// Arrange.
		const proxy = vi.fn();
		const server = new RpcServer(proxy);

		// Act.
		server.add("err", () => {
			throw new Error("Something went wrong");
		});

		await expect(
			server.receive({
				jsonrpc: "2.0",
				method: "err",
				id: "123",
			} satisfies JsonRpcRequest),
		).rejects.toEqual(new Error("Something went wrong"));

		// Assert
		expect(proxy).toHaveBeenCalledTimes(1);
		expect(proxy).toHaveBeenCalledWith<[JsonRpcResponse]>({
			jsonrpc: "2.0",
			id: "123",
			error: {
				code: JsonRpcErrorCode.InternalError,
				message: "Something went wrong",
			},
		});
	});
});

type MockParameters = {
	name: string;
};
