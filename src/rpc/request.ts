import { z } from "zod/v4-mini";

import type { JsonObject, JsonValue } from "../json.js";

const TYPE_ID = "request";

/**
 * Schema of a request.
 */
const schema = z.object({
	__type: z.literal(TYPE_ID),
	id: z.string(),
	path: z.string(),
	body: z.optional(z.any()),
	timeout: z.optional(z.number()),
	unidirectional: z.boolean(),
});

/**
 * Provides information for an RPC request.
 */
export class Request<TBody extends JsonValue> {
	/**
	 * Private backing field for {@link Request.id}.
	 */
	#id: string = crypto.randomUUID();

	/**
	 * Private backing field for the request information.
	 */
	#options: RequestOptions<TBody>;

	/**
	 * Initializes a new instance of the {@link Request} class.
	 * @param options Request options.
	 */
	constructor(options: RequestOptions<TBody>) {
		this.#options = options;
	}

	/**
	 * Body sent with the request.
	 * @returns The body.
	 */
	public get body(): RequestOptions<TBody>["body"] {
		return this.#options.body;
	}

	/**
	 * Value used to identify the request.
	 * @returns The identifier.
	 */
	public get id(): string {
		return this.#id;
	}

	/**
	 * Path of the request.
	 * @returns The path.
	 */
	public get path(): string {
		return this.#options.path;
	}

	/**
	 * Timeout duration in milliseconds; defaults to `5000` (5s).
	 * @returns The timeout.
	 */
	public get timeout(): number {
		return this.#options.timeout ?? 5000;
	}

	/**
	 * Indicates whether the request is unidirectional; when `true`, a response will not be awaited.
	 * @returns The value.
	 */
	public get unidirectional(): boolean {
		return this.#options.unidirectional ?? false;
	}

	/**
	 * Parses the request from the specified value.
	 * @param value Value to parse.
	 * @returns The parsed request; otherwise `undefined`.
	 */
	public static parse<TBody extends JsonValue>(value: JsonValue): Request<TBody> | undefined {
		const { success, data } = schema.safeParse(value);
		if (success) {
			const request = new Request(data);
			request.#id = data.id;

			return request;
		}
	}

	/**
	 * Gets the serializable value.
	 * @returns The value.
	 */
	public toJSON(): JsonObject {
		const { id, path, body, timeout, unidirectional } = this;
		return { __type: TYPE_ID, id, path, body, timeout, unidirectional } satisfies z.infer<typeof schema>;
	}
}

/**
 * Request options associated with a request to be sent to the server.
 */
export type RequestOptions<T extends JsonValue = undefined> = (T extends undefined
	? {
			/**
			 * Body sent with the request.
			 */
			body?: T;
		}
	: {
			/**
			 * Body sent with the request.
			 */
			body: T;
		}) & {
	/**
	 * Path of the request.
	 */
	path: string;

	/**
	 * Timeout duration in milliseconds; defaults to `5000` (5s).
	 */
	timeout?: number;

	/**
	 * Indicates whether the request is unidirectional; when `true`, a response will not be awaited.
	 */
	unidirectional?: boolean;
};
