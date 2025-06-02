import { describe, expect, it, vi } from "vitest";

import { type JsonRpcErrorResponse, JsonRpcResponse, RpcRequestResponder } from "../index.js";

/**
 * Describes {@link RpcRequestResponder}.
 */
describe("RpcRequestResponder", () => {
	/**
	 * Asserts `canRespond` is `true` when a request id was provided.
	 */
	it("can respond by default with an id", () => {
		// Arrange, act.
		const res = new RpcRequestResponder(vi.fn(), "123");

		// Assert.
		expect(res.canRespond).toBe(true);
	});

	/**
	 * Asserts `canRespond` is `false` when a request id was not provided.
	 */
	it("cannot respond by default without an id", () => {
		// Arrange, act.
		const res = new RpcRequestResponder(vi.fn(), undefined);

		// Assert.
		expect(res.canRespond).toBe(false);
	});

	/**
	 * Asserts success can be sent with an id.
	 */
	it("can send success with id", async () => {
		// Arrange.
		const proxy = vi.fn();
		const res = new RpcRequestResponder(proxy, "123");

		// ACt
		await res.success("Hello world");

		// Assert
		expect(res.canRespond).toBe(false);
		expect(proxy).toHaveBeenCalledExactlyOnceWith<[JsonRpcResponse]>({
			jsonrpc: "2.0",
			result: "Hello world",
			id: "123",
		});
	});

	/**
	 * Asserts success cannot be sent without an id.
	 */
	it("can only send success with id", async () => {
		// Arrange.
		const proxy = vi.fn();
		const res = new RpcRequestResponder(proxy, undefined);

		// ACt
		await res.success("Hello world");

		// Assert
		expect(res.canRespond).toBe(false);
		expect(proxy).toHaveBeenCalledTimes(0);
	});

	describe.each([
		{ id: "123" },
		{ id: undefined },
	])("with id: $id", ({ id }) => {
		/**
		 * Asserts errors can be sent.
		 */
		it("can send error", async () => {
			// Arrange.
			const proxy = vi.fn();
			const res = new RpcRequestResponder(proxy, id);

			// Act.
			await res.error({
				code: 123,
				message: "Something went wrong",
			});

			// Assert.
			expect(res.canRespond).toBe(false);
			expect(proxy).toHaveBeenCalledExactlyOnceWith<[JsonRpcErrorResponse]>({
				jsonrpc: "2.0",
				error: {
					code: 123,
					message: "Something went wrong",
				},
				id,
			});
		});

		/**
		 * Asserts successive messages cannot be sent.
		 */
		it("cannot send successive responses", async () => {
			// Arrange.
			const proxy = vi.fn();
			const res = new RpcRequestResponder(proxy, id);

			// Act.
			for (let i = 0; i < 3; i++) {
				await res.error({
					code: 123,
					message: "Something went wrong",
				});
			}

			// Assert.
			expect(res.canRespond).toBe(false);
			expect(proxy).toHaveBeenCalledTimes(1);
		});
	});
});
