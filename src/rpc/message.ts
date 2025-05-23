import type { JsonValue } from "../json.js";
import { has } from "../objects.js";
import type { ClientRequestMessage } from "./client.js";
import type { ServerResponseMessage } from "./server.js";

/**
 * Determines whether the specified value is a request from a client.
 * @param value Value.
 * @returns `true` when the value is a request; otherwise `false`.
 */
export function isRequest(value: unknown): value is ClientRequestMessage {
	return isMessage(value, "request") && has(value, "unidirectional", "boolean");
}

/**
 * Determines whether the specified value is a response from a server.
 * @param value Value.
 * @returns `true` when the value is a response; otherwise `false`.
 */
export function isResponse(value: unknown): value is ServerResponseMessage {
	return isMessage(value, "response") && has(value, "status", "number");
}

/**
 * Determines whether the specified {@link value} is a message of type {@link type}.
 * @param value Value.
 * @param type Message type.
 * @returns `true` when the value of a {@link Message} of type {@link type}; otherwise `false`.
 */
function isMessage<T extends MessageType>(value: unknown, type: T): value is Message<T, JsonValue> {
	// The value should be an object.
	if (value === undefined || value === null || typeof value !== "object") {
		return false;
	}

	// The value should have a __type property of "response".
	if (!("__type" in value) || value.__type !== type) {
		return false;
	}

	// The value should should have at least an id, status, and path1.
	return has(value, "id", "string") && has(value, "path", "string");
}

/**
 * A message sent between the plugin and the property inspector.
 */
export type Message<TType extends MessageType, TBody extends JsonValue> = {
	/**
	 * Identifies the object as a request or a response.
	 */
	readonly __type: TType;

	/**
	 * Contents of the message.
	 */
	readonly body?: TBody;

	/**
	 * Unique identifier associated with message.
	 */
	readonly id: string;

	/**
	 * Path of the request.
	 */
	readonly path: string;
};

/**
 * Identifies the message type.
 */
type MessageType = "request" | "response";

/**
 * Status code of a response.
 * - `200` the request was successful.
 * - `202` the request was unidirectional, and does not have a response.
 * - `406` the request could not be accepted by the server.
 * - `408` the request timed-out.
 * - `500` the request failed.
 * - `501` the request is not implemented by the server, and could not be fulfilled.
 */
export type StatusCode =
	/**
	 * The request was successful.
	 */
	| 200

	/**
	 * The request was unidirectional, and does not have a response
	 */
	| 202

	/**
	 * The request could not be accepted by the server.
	 */
	| 406

	/**
	 * The request timed-out.
	 */
	| 408

	/**
	 * The request failed with an error.
	 */
	| 500

	/**
	 * The request is not implemented by the server, and could not be fulfilled.
	 */
	| 501;
