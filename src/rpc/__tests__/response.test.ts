import { describe, expect, it, vi } from "vitest";

import { type JsonRpcErrorResponse, JsonRpcResponse, RpcRequestResponder } from "../index.js";

/**
 * Describes {@link RpcRequestResponder}.
 */
describe("RpcRequestResponder", () => {
	it("can respond by default", () => {
		// Arrange, act.
		const res = new RpcRequestResponder(vi.fn(), undefined);

		// Assert.
		expect(res.canRespond).toBe(true);
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
		expect(proxy).toHaveBeenCalledTimes(1);
		expect(proxy).toHaveBeenCalledWith<[JsonRpcResponse]>({
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
		expect(res.canRespond).toBe(true);
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
			expect(proxy).toHaveBeenCalledTimes(1);
			expect(proxy).toHaveBeenCalledWith<[JsonRpcErrorResponse]>({
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
