// import { describe, expect, it, vi } from "vitest";

// import type { JsonValue } from "../../index.js";
// import { Request, Responder } from "../index.js";

// describe("Responder", () => {
// 	/**
// 	 * Asserts {@link Responder.send} sends a `200` with the optional body.
// 	 */
// 	it("should send 200 with success", async () => {
// 		// Arrange.
// 		const proxy = vi.fn();
// 		const req = new Request({ path: "/pets" });
// 		const responder = new Responder(req, proxy);

// 		// Act.
// 		await responder.success(["Arthur", "Izzie", "Murphy"]);

// 		// Assert.
// 		expect(proxy).toHaveBeenCalledTimes(1);
// 		expect(proxy).toHaveBeenLastCalledWith<[JsonValue]>(
// 			new Response(req.id, req.path, 200, ["Arthur", "Izzie", "Murphy"]).toJSON(),
// 		);
// 	});

// 	/**
// 	 * Asserts {@link Responder.fail} sends a `500` with the optional body.
// 	 */
// 	it("should send 500 with fail", async () => {
// 		// Arrange.
// 		const proxy = vi.fn();
// 		const req = new Request({
// 			path: "/toggle-light",
// 			body: {
// 				id: 123,
// 			},
// 		});
// 		const responder = new Responder(req, proxy);

// 		// Act.
// 		await responder.fail([]);

// 		// Assert.
// 		expect(proxy).toHaveBeenCalledTimes(1);
// 		expect(proxy).toHaveBeenLastCalledWith<[JsonValue]>(new Response(req.id, req.path, 500, []).toJSON());
// 	});

// 	/**
// 	 * Asserts {@link Responder.send} sends a status.
// 	 */
// 	it("send status", async () => {
// 		// Arrange.
// 		const proxy = vi.fn();
// 		const req = new Request({
// 			path: "/mute-mic",
// 		});
// 		const responder = new Responder(req, proxy);

// 		// Act.
// 		await responder.send(501);

// 		// Assert.
// 		expect(proxy).toHaveBeenCalledTimes(1);
// 		expect(proxy).toHaveBeenLastCalledWith<[JsonValue]>(new Response(req.id, req.path, 501, undefined).toJSON());
// 	});

// 	/**
// 	 * Asserts a response can be sent when the request is unidirectional.
// 	 */
// 	it("can respond when unidirectional", async () => {
// 		// Arrange.
// 		const proxy = vi.fn();
// 		const req = new Request({
// 			path: "/test",
// 			unidirectional: true,
// 		});
// 		const responder = new Responder(req, proxy);

// 		// Act.
// 		await responder.success();

// 		// Assert.
// 		expect(proxy).toHaveBeenCalledTimes(1);
// 		expect(proxy).toHaveBeenLastCalledWith<[JsonValue]>(new Response(req.id, req.path, 200, undefined).toJSON());
// 	});

// 	/**
// 	 * Asserts a response is not sent after a response has already been sent.
// 	 */
// 	it("down not respond more than once", async () => {
// 		// Arrange.
// 		const proxy = vi.fn();
// 		const req = new Request({
// 			path: "/test",
// 			body: {
// 				id: 123,
// 			},
// 		});
// 		const responder = new Responder(req, proxy);

// 		// Act.
// 		await responder.success();
// 		await responder.success({ test: "other" });

// 		// Assert.
// 		expect(proxy).toHaveBeenCalledTimes(1);
// 		expect(proxy).toHaveBeenLastCalledWith<[JsonValue]>(new Response(req.id, req.path, 200, undefined).toJSON());
// 	});
// });
