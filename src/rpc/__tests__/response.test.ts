import { describe, expect, test } from "vitest";

import { Response } from "../response.js";
import type { StatusCode } from "../status.js";

/**
 * Provides assertions for {@link @Response}.
 */
describe("Response", () => {
	/**
	 * Asserts the constructor initializes a response.
	 */
	test("construction", () => {
		// Arrange, act.
		const res = new Response("123", "/test", 200, "body");

		// Assert
		expect(res.body).toBe("body");
		expect(res.id).toBe("123");
		expect(res.path).toBe("/test");
		expect(res.status).toBe(200);
	});

	/**
	 * Asserts responses are serialized with all required information.
	 */
	test("toJSON", () => {
		// Arrange.
		const res = new Response("123", "/test", 200, { name: "Elgato" });

		// Act.
		const json = JSON.stringify(res);

		// Assert.
		expect(json).toEqual(
			JSON.stringify({
				__type: "response",
				id: "123",
				path: "/test",
				body: {
					name: "Elgato",
				},
				status: 200,
			}),
		);
	});

	/**
	 * Asserts responses can be parsed from objects.
	 */
	test("parse", () => {
		// Arrange.
		const res = new Response("123", "/test", 200, { name: "Elgato" });
		const clone = JSON.parse(JSON.stringify(res));

		// Act.
		const actual = Response.parse(clone);

		// Assert.
		expect(actual).toBeDefined();
		expect(actual?.body).toEqual(res.body);
		expect(actual?.id).toEqual(res.id);
		expect(actual?.path).toEqual(res.path);
		expect(actual?.status).toBe(res.status);
	});

	/**
	 * Asserts {@link Response.ok} evaluates the status code of the response.
	 */
	test.each([
		{
			status: 200 as StatusCode,
			expected: true,
		},
		{
			status: 406 as StatusCode,
			expected: false,
		},
	])("ok > $status = $expected", ({ status, expected }) => {
		const res = new Response("id", "path", status, undefined);
		expect(res.ok).toBe(expected);
	});

	/**
	 * Asserts undefined is returned when parsing was not successful.
	 */
	test.each([undefined, null, {}, "foo"])("$0", (value) => {
		// Arrange, act, assert.
		const req = Response.parse(value);
		expect(req).toBeUndefined();
	});
});
