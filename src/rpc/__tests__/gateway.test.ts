import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { JsonValue } from "../../index.js";
import { Gateway, Request, Responder, Response } from "../index.js";

describe("Gateway", () => {
	/**
	 * Asserts {@link Gateway.receive} correctly handles unexpected data structures.
	 */
	it("must not process unknown payloads", async () => {
		// Arrange.
		const proxy = vi.fn();
		const gateway = new Gateway(proxy);

		// Act.
		const result = await gateway.receive(true);

		// Assert.
		expect(result).toBe(false);
		expect(proxy).toHaveBeenCalledTimes(0);
	});

	/**
	 * Asserts {@link Gateway} returns `false` for unknown routes.
	 */
	it("returns false unknown routes", async () => {
		// Arrange.
		const gateway = new Gateway(vi.fn());
		const msg = new Request({ path: "abc123" });

		// Act.
		const result = await gateway.receive(msg.toJSON());

		// Assert.
		expect(result).toBe(false);
	});

	/**
	 * Asserts {@link Gateway} executes route handlers in order.
	 */
	it("must execute handlers in order", async () => {
		// Arrange
		const proxy = vi.fn();
		const gateway = new Gateway(proxy);
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
		gateway.route("/test", handlers[0]);
		gateway.route("/test", handlers[1]);
		const req = new Request({
			path: "/test",
			body: {
				name: "Elgato",
			},
		});

		await gateway.receive(req.toJSON());

		// Assert
		expect(order).toEqual(["First", "Second"]);
	});

	/**
	 * Asserts {@link Gateway} returns a 406 when the proxy did not accept the payload.
	 */
	it("must return 406 when the payload could not be sent to the server", async () => {
		// Arrange.
		const proxy = vi.fn().mockReturnValue(false);
		const gateway = new Gateway(proxy);

		// Act.
		const res = await gateway.send("/");

		// Assert.
		expect(res.status).toBe(406);
		expect(res.ok).toBe(false);
		expect(res.body).toBeUndefined();
	});

	/**
	 * Asserts the disposable of {@link Gateway.route} can remove the route.
	 */
	it("can remove routes", async () => {
		// Arrange.
		const proxy = vi.fn();
		const listener = vi.fn();
		const gateway = new Gateway(proxy);
		const req = new Request({
			path: "/test",
		});

		const disposable = gateway.route("/test", listener);

		// Act, assert.
		await gateway.receive(req.toJSON());
		expect(listener).toHaveBeenCalledTimes(1);

		// Act, assert (dispose).
		disposable.dispose();
		await gateway.receive(req.toJSON());
		expect(listener).toHaveBeenCalledTimes(1); // Should still be 1.
	});

	/**
	 * Asserts context can be provided to routed requests.
	 */
	it("provides context to route", async () => {
		// Arrange.
		const proxy = vi.fn();
		const listener = vi.fn();
		const gateway = new Gateway(proxy);
		const req = new Request({
			path: "/context",
		});

		// Act.
		gateway.route("/context", listener);
		await gateway.receive(req.toJSON(), () => "Context");

		// Assert.
		expect(listener).toHaveBeenCalledTimes(1);
		expect(listener).toHaveBeenCalledWith(expect.any(Request), expect.any(Responder), "Context");
	});

	describe("fetch e2e", () => {
		let client!: Gateway;
		let server!: Gateway;
		let cascade!: (value: string) => void;

		beforeEach(() => {
			cascade = vi.fn();

			client = new Gateway(async (value: Request<JsonValue> | Response<JsonValue>) => {
				try {
					await server.receive(JSON.parse(JSON.stringify(value)), () => "Context");
				} catch (err) {
					// SafeError is acceptable as it is used for "/error"
					if (!(err instanceof SafeError)) {
						throw err;
					}
				}

				return true;
			});

			server = new Gateway(async (value: Request<JsonValue> | Response<JsonValue>) => {
				await client.receive(JSON.parse(JSON.stringify(value)));
				return true;
			});

			server.route("/async", () => {
				return Promise.resolve(["Mario", "Luigi", "Peach"]);
			});

			server.route("/test", (req, res) => {
				res.success({
					name: "Elgato",
				});
			});

			server.route("/error", () => {
				throw new SafeError();
			});

			server.route("/cascade", () => {
				cascade("First");
				return true;
			});

			server.route("/cascade", () => {
				cascade("Second");
				return false;
			});
		});

		afterEach(() => vi.resetAllMocks());

		/**
		 * Test known routes.
		 */
		describe("known routes", () => {
			/**
			 * Asserts a response of `200` for a successful request.
			 */
			it("200 on success", async () => {
				// Arrange, act.
				const { body, ok, status } = await client.send<MockData>("/test");

				// Assert.
				expect(status).toBe(200);
				expect(ok).toBeTruthy();
				expect(body).toEqual({ name: "Elgato" });
			});

			/**
			 * Asserts a response of `202` for a unidirectional request.
			 */
			it("202 on unidirectional request", async () => {
				// Arrange, act.
				const { body, ok, status } = await client.send({
					path: "/test",
					unidirectional: true,
				});

				// Assert.
				expect(status).toBe(202);
				expect(ok).toBeTruthy();
				expect(body).toBeUndefined();
			});

			/**
			 * Asserts the response contains the data of a handler that returns a promise.
			 */
			it("data with promise result", async () => {
				// Arrange, act.
				const { body, ok, status } = await client.send<MockData>("/async");

				// Assert.
				expect(status).toBe(200);
				expect(ok).toBeTruthy();
				expect(body).toEqual(["Mario", "Luigi", "Peach"]);
			});

			/**
			 * Asserts a response of `500` for an error thrown by the handler.
			 */
			it("500 on error", async () => {
				// Arrange, act.
				const { body, ok, status } = await client.send("/error");

				// Assert.
				expect(status).toBe(500);
				expect(ok).toBeFalsy();
				expect(body).toBeUndefined();
			});

			/**
			 * Asserts a response of `202` for an error thrown by the handler on a unidirectional request.
			 */
			it("202 on error (unidirectional request)", async () => {
				// Arrange, act.
				const { body, ok, status } = await client.send({
					path: "/error",
					unidirectional: true,
				});

				// Assert.
				expect(status).toBe(202);
				expect(ok).toBeTruthy();
				expect(body).toBeUndefined();
			});

			/**
			 * Asserts a response of `408` for a timeout.
			 */
			it("408 on timeout", async () => {
				// Arrange.
				// @ts-expect-error setTimeout should return Nodejs.Timeout, but we aren't using it, so its fine.
				const spyOnSetTimeout = vi.spyOn(global, "setTimeout").mockImplementation((fn) => fn());
				const spyOnClearTimeout = vi.spyOn(global, "clearTimeout");

				// Act.
				const res = client.send({
					path: "/test",
					timeout: 1,
				});

				const { body, ok, status } = await res;

				// Assert.
				expect(status).toBe(408);
				expect(ok).toBeFalsy();
				expect(body).toBeUndefined();
				expect(spyOnSetTimeout).toHaveBeenCalledWith(expect.any(Function), 1);
				expect(spyOnClearTimeout).toHaveBeenCalledTimes(0);
			});
		});

		/**
		 * Test unknown routes.
		 */
		describe("unknown routes", () => {
			/**
			 * Asserts a response of `501` for unknown paths.
			 */
			it("501 on unknown routes", async () => {
				// Arrange, act.
				const { body, ok, status } = await client.send("/unknown");

				// Assert.
				expect(status).toBe(501);
				expect(ok).toBeFalsy();
				expect(body).toBeUndefined();
			});

			/**
			 * Asserts a response of `501` for unknown paths (unidirectional request).
			 */
			it("501 on unknown routes (unidirectional request)", async () => {
				// Arrange, act.
				const { body, ok, status } = await client.send({
					path: "/unknown",
					unidirectional: true,
				});

				// Assert.
				expect(status).toBe(501);
				expect(ok).toBeFalsy();
				expect(body).toBeUndefined();
			});
		});

		/**
		 * Asserts {@link Gateway.send} executes all paths, but does not respond more than once.
		 */
		it("should execute all, but return after the first", async () => {
			// Arrange, act.
			const { body, ok, status } = await client.send("/cascade");

			// Assert.
			expect(status).toBe(200);
			expect(ok).toBe(true);
			expect(body).toBe(true);
			expect(cascade).toHaveBeenCalledTimes(2);
			expect(cascade).toHaveBeenNthCalledWith(1, "First");
			expect(cascade).toHaveBeenNthCalledWith(2, "Second");
		});
	});
});

type MockData = {
	name: string;
};

class SafeError extends Error {}
