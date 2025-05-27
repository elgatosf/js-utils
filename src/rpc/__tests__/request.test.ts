import { describe, expect, test } from "vitest";

import { Request } from "../index.js";

/**
 * Provides assertions for {@link @Request}.
 */
describe("Request", () => {
	/**
	 * Asserts the constructor initializes a request with partial information.
	 */
	test("construction with defaults", () => {
		// Arrange, act.
		const req = new Request({ path: "/test" });

		// Assert
		expect(req.body).toBe(undefined);
		expect(req.id).toBeDefined();
		expect(req.path).toBe("/test");
		expect(req.timeout).toBe(5000);
		expect(req.unidirectional).toBe(false);
	});

	/**
	 * Asserts the constructor fully initializes a request.
	 */
	test("construction", () => {
		// Arrange, act.
		const req = new Request({
			body: {
				name: "Elgato",
			},
			path: "/test",
			timeout: 1,
			unidirectional: true,
		});

		// Assert.
		expect(req.body).toEqual({ name: "Elgato" });
		expect(req.id).toBeDefined();
		expect(req.path).toBe("/test");
		expect(req.timeout).toBe(1);
		expect(req.unidirectional).toBe(true);
	});

	/**
	 * Asserts requests are serialized with all required information.
	 */
	test("toJSON", () => {
		// Arrange.
		const req = new Request({
			body: {
				name: "Elgato",
			},
			path: "/test",
			timeout: 1,
			unidirectional: true,
		});

		// Act.
		const json = JSON.stringify(req);

		// Assert.
		expect(json).toEqual(
			JSON.stringify({
				__type: "request",
				id: req.id,
				path: req.path,
				body: req.body,
				timeout: req.timeout,
				unidirectional: req.unidirectional,
			}),
		);
	});

	/**
	 * Asserts requests can be parsed from objects.
	 */
	test("parse", () => {
		// Arrange.
		const req = new Request({
			body: {
				name: "Elgato",
			},
			path: "/test",
			timeout: 1,
			unidirectional: true,
		});

		const clone = JSON.parse(JSON.stringify(req));

		// Act.
		const actual = Request.parse(clone);

		// Assert.
		expect(actual).toBeDefined();
		expect(actual?.body).toEqual(req.body);
		expect(actual?.id).toEqual(req.id);
		expect(actual?.path).toEqual(req.path);
		expect(actual?.timeout).toEqual(req.timeout);
		expect(actual?.unidirectional).toEqual(req.unidirectional);
	});

	/**
	 * Asserts undefined is returned when parsing was not successful.
	 */
	test.each([undefined, null, {}, "foo"])("$0", (value) => {
		// Arrange, act, assert.
		const req = Request.parse(value);
		expect(req).toBeUndefined();
	});
});
