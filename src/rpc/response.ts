import { z } from "zod/v4-mini";

import type { JsonObject, JsonValue } from "../json.js";
import type { StatusCode } from "./status.js";

const TYPE_ID = "response";

/**
 * Schema of a response.
 */
const schema = z.object({
	__type: z.literal(TYPE_ID),
	id: z.string(),
	path: z.string(),
	body: z.optional(z.any()),
	status: z.union([
		z.literal(200),
		z.literal(202),
		z.literal(406),
		z.literal(408),
		z.literal(500),
		z.literal(501),
	]),
});

/**
 * Response to an RPC message.
 */
export class Response<T extends JsonValue = undefined> {
	/**
	 * Optional body returned by the server.
	 */
	public readonly body: T;

	/**
	 * Original request identifier.
	 */
	public readonly id: string;

	/**
	 * Original request path.
	 */
	public readonly path: string;

	/**
	 * Status code that represents the overall status of the response.
	 */
	public readonly status: StatusCode;

	/**
	 * Initializes a new instance of the {@link Response} class.
	 * @param id Original request identifier
	 * @param path Original request path.
	 * @param status Status code that represents the overall status of the response.
	 * @param body Optional body returned by the server.
	 */
	constructor(id: string, path: string, status: StatusCode, body: T) {
		this.id = id;
		this.path = path;
		this.status = status;
		this.body = body;
	}

	/**
	 * Indicates whether the request was successful.
	 * @returns `true` when the status indicates a success; otherwise `false`.
	 */
	public get ok(): boolean {
		return this.status >= 200 && this.status < 300;
	}

	/**
	 * Parses the response from the specified value.
	 * @param value Value to parse.
	 * @returns The parsed response; otherwise `undefined`.
	 */
	public static parse<T extends JsonValue = undefined>(value: JsonValue): Response<T> | undefined {
		const { success, data } = schema.safeParse(value);
		if (success) {
			return new Response(data.id, data.path, data.status, data.body);
		}

		return undefined;
	}

	/**
	 * Gets the serializable value.
	 * @returns The value.
	 */
	public toJSON(): JsonObject {
		const { id, path, body, status } = this;
		return { __type: TYPE_ID, id, path, body, status } satisfies z.infer<typeof schema>;
	}
}
