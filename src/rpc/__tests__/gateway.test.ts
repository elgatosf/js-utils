import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type JsonValue, type PromiseResolvers, withResolvers } from "../../index.js";
import { Client, Server } from "../index.js";

describe("fetch e2e", () => {
	let client!: Client;
	let server!: Server;
	let cascade!: (value: string) => void;
	let notified!: PromiseResolvers<MockData>;

	beforeEach(() => {
		cascade = vi.fn();
		notified = withResolvers<MockData>();

		client = new Client(async (value: JsonValue) => {
			try {
				await server.receive(value, () => "Context");
			} catch (err) {
				// SafeError is acceptable as it is used for "/error"
				if (!(err instanceof SafeError)) {
					throw err;
				}
			}

			return true;
		});

		server = new Server(async (value: JsonValue) => {
			await client.receive(value);
			return true;
		});

		server.add("/async", () => {
			return Promise.resolve(["Mario", "Luigi", "Peach"]);
		});

		server.add("/test", (_, res) => {
			res.success({
				name: "Elgato",
			});
		});

		server.add("/error", () => {
			throw new SafeError();
		});

		server.add("/cascade", () => {
			cascade("First");
			return true;
		});

		server.add("/cascade", () => {
			cascade("Second");
			return false;
		});

		server.add("/notify", (params: MockData) => notified.resolve(params));
	});

	afterEach(() => vi.resetAllMocks());

	/**
	 * Test known routes.
	 */
	describe("known routes", () => {
		/**
		 * Asserts a request receives a response.
		 */
		it("requests get responses", async () => {
			// Arrange, act.
			const res = await client.request("/test");

			// Assert.
			expect(res.ok).toBe(true);
			if (res.ok) {
				expect(res.result).toEqual({ name: "Elgato" });
			}
		});

		/**
		 * Asserts a notification invokes the method without a response.
		 */
		it("notify invoke method", async () => {
			// Arrange, act.
			await client.notify("/notify", {
				name: "Elgato",
			});

			// Assert.
			expect(notified.promise).resolves.toEqual({ name: "Elgato" });
		});

		/**
		 * Asserts the response contains the data of a handler that returns a promise.
		 */
		it("data with promise result", async () => {
			// Arrange, act.
			const res = await client.request<MockData>("/async", {
				name: "Elgato",
			});

			// Assert.
			expect(res.ok).toBe(true);
			if (res.ok) {
				expect(res.result).toEqual(["Mario", "Luigi", "Peach"]);
			}
		});

		// /**
		//  * Asserts a response of `500` for an error thrown by the handler.
		//  */
		// it("500 on error", async () => {
		// 	// Arrange, act.
		// 	const { body, ok, status } = await client.send("/error");

		// 	// Assert.
		// 	expect(status).toBe(500);
		// 	expect(ok).toBeFalsy();
		// 	expect(body).toBeUndefined();
		// });

		// /**
		//  * Asserts a response of `202` for an error thrown by the handler on a unidirectional request.
		//  */
		// it("202 on error (unidirectional request)", async () => {
		// 	// Arrange, act.
		// 	const { body, ok, status } = await client.send({
		// 		path: "/error",
		// 		unidirectional: true,
		// 	});

		// 	// Assert.
		// 	expect(status).toBe(202);
		// 	expect(ok).toBeTruthy();
		// 	expect(body).toBeUndefined();
		// });

		// /**
		//  * Asserts a response of `408` for a timeout.
		//  */
		// it("408 on timeout", async () => {
		// 	// Arrange.
		// 	// @ts-expect-error setTimeout should return Nodejs.Timeout, but we aren't using it, so its fine.
		// 	const spyOnSetTimeout = vi.spyOn(global, "setTimeout").mockImplementation((fn) => fn());
		// 	const spyOnClearTimeout = vi.spyOn(global, "clearTimeout");

		// 	// Act.
		// 	const res = client.send({
		// 		path: "/test",
		// 		timeout: 1,
		// 	});

		// 	const { body, ok, status } = await res;

		// 	// Assert.
		// 	expect(status).toBe(408);
		// 	expect(ok).toBeFalsy();
		// 	expect(body).toBeUndefined();
		// 	expect(spyOnSetTimeout).toHaveBeenCalledWith(expect.any(Function), 1);
		// 	expect(spyOnClearTimeout).toHaveBeenCalledTimes(0);
		// });
	});

	// /**
	//  * Test unknown routes.
	//  */
	// describe("unknown routes", () => {
	// 	/**
	// 	 * Asserts a response of `501` for unknown paths.
	// 	 */
	// 	it("501 on unknown routes", async () => {
	// 		// Arrange, act.
	// 		const { body, ok, status } = await client.send("/unknown");

	// 		// Assert.
	// 		expect(status).toBe(501);
	// 		expect(ok).toBeFalsy();
	// 		expect(body).toBeUndefined();
	// 	});

	// 	/**
	// 	 * Asserts a response of `501` for unknown paths (unidirectional request).
	// 	 */
	// 	it("501 on unknown routes (unidirectional request)", async () => {
	// 		// Arrange, act.
	// 		const { body, ok, status } = await client.send({
	// 			path: "/unknown",
	// 			unidirectional: true,
	// 		});

	// 		// Assert.
	// 		expect(status).toBe(501);
	// 		expect(ok).toBeFalsy();
	// 		expect(body).toBeUndefined();
	// 	});
	// });

	// /**
	//  * Asserts {@link Gateway.send} executes all paths, but does not respond more than once.
	//  */
	// it("should execute all, but return after the first", async () => {
	// 	// Arrange, act.
	// 	const { body, ok, status } = await client.send("/cascade");

	// 	// Assert.
	// 	expect(status).toBe(200);
	// 	expect(ok).toBe(true);
	// 	expect(body).toBe(true);
	// 	expect(cascade).toHaveBeenCalledTimes(2);
	// 	expect(cascade).toHaveBeenNthCalledWith(1, "First");
	// 	expect(cascade).toHaveBeenNthCalledWith(2, "Second");
	// });
});

type MockData = {
	name: string;
};

class SafeError extends Error {}
