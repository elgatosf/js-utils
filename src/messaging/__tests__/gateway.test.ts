import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { JsonValue } from "../../json.js";
import { MessageGateway, type UnscopedMessageRequest } from "../gateway.js";
import type { RawMessageRequest } from "../message.js";
import { MessageResponder } from "../responder.js";

describe("MessageGateway", () => {
	it("must provide sender context", async () => {
		// Arrange.
		const proxy = vi.fn();
		const context = {
			name: "Elgato",
		};
		const handler = vi.fn();
		const gateway = new MessageGateway<typeof context>(proxy);
		gateway.route("/test", handler);

		// Act.
		await gateway.process(
			{
				__type: "request",
				id: "req1",
				path: "/test",
				unidirectional: false,
				body: {
					name: "Elgato",
				},
			} satisfies RawMessageRequest,
			() => context,
		);

		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler).toHaveBeenCalledWith<[UnscopedMessageRequest<typeof context>, MessageResponder]>(
			{
				context,
				path: "/test",
				unidirectional: false,
				body: {
					name: "Elgato",
				},
			},
			expect.any(MessageResponder),
		);
	});

	/**
	 * Asserts {@link MessageGateway.process} correctly handles unexpected data structures.
	 */
	it("must not process unknown payloads", async () => {
		// Arrange.
		const proxy = vi.fn();
		const gateway = new MessageGateway<object>(proxy);

		// Act.
		const result = await gateway.process(true, vi.fn());

		// Assert.
		expect(result).toBe(false);
		expect(proxy).toHaveBeenCalledTimes(0);
	});

	/**
	 * Asserts {@link MessageGateway} returns `false` for unknown routes.
	 */
	it("returns false unknown routes", async () => {
		// Arrange.
		const gateway = new MessageGateway<object>(vi.fn());

		// Act.
		const result = await gateway.process(
			{
				__type: "request",
				id: "abc123",
				path: "/",
				unidirectional: false,
			} satisfies RawMessageRequest,
			vi.fn(),
		);

		// Assert.
		expect(result).toBe(false);
	});

	/**
	 * Asserts {@link MessageGateway} executes route handlers in order.
	 */
	it("must execute handlers in order", async () => {
		// Arrange
		const proxy = vi.fn();
		const gateway = new MessageGateway<object>(proxy);
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
		await gateway.process(
			{
				__type: "request",
				id: "12345",
				path: "/test",
				unidirectional: false,
				body: {
					name: "Elgato",
				},
			} satisfies RawMessageRequest,
			vi.fn(),
		);

		// Assert
		expect(order).toEqual(["First", "Second"]);
	});

	/**
	 * Asserts {@link MessageGateway} returns a 406 when the proxy did not accept the payload.
	 */
	it("must return 406 when the payload could not be sent to the server", async () => {
		// Arrange.
		const proxy = vi.fn().mockReturnValue(false);
		const gateway = new MessageGateway<object>(proxy);

		// Act.
		const res = await gateway.fetch("/");

		// Assert.
		expect(res.status).toBe(406);
		expect(res.ok).toBe(false);
		expect(res.body).toBeUndefined();
	});

	/**
	 * Asserts the disposable of {@link MessageGateway.route} can remove the route.
	 */
	it("can remove routes", async () => {
		// Arrange.
		const proxy = vi.fn();
		const listener = vi.fn();
		const gateway = new MessageGateway<object>(proxy);
		const message = {
			__type: "request",
			id: "12345",
			path: "/test",
			unidirectional: false,
		} satisfies RawMessageRequest;

		const disposable = gateway.route("/test", listener);

		// Act, assert.
		await gateway.process(message, vi.fn());
		expect(listener).toHaveBeenCalledTimes(1);

		// Act, assert (dispose).
		disposable.dispose();
		await gateway.process(message, vi.fn());
		expect(listener).toHaveBeenCalledTimes(1); // Should still be 1.
	});

	describe("fetch e2e", () => {
		let client!: MessageGateway<object>;
		let server!: MessageGateway<object>;
		let cascade!: (message: string) => void;

		beforeEach(() => {
			cascade = vi.fn();

			client = new MessageGateway(async (value) => {
				try {
					await server.process(value as JsonValue, vi.fn());
				} catch (err) {
					// SafeError is acceptable as it is used for "/error"
					if (!(err instanceof SafeError)) {
						throw err;
					}
				}

				return true;
			});

			server = new MessageGateway<object>(async (value) => {
				await client.process(value as JsonValue, vi.fn());
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
				const { body, ok, status } = await client.fetch<MockData>("/test");

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
				const { body, ok, status } = await client.fetch({
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
				const { body, ok, status } = await client.fetch<MockData>("/async");

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
				const { body, ok, status } = await client.fetch("/error");

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
				const { body, ok, status } = await client.fetch({
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
				const res = client.fetch({
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
				const { body, ok, status } = await client.fetch("/unknown");

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
				const { body, ok, status } = await client.fetch({
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
		 * Asserts {@link MessageGateway.fetch} executes all paths, but does not respond more than once.
		 */
		it("should execute all, but return after the first", async () => {
			// Arrange, act.
			const { body, ok, status } = await client.fetch("/cascade");

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
