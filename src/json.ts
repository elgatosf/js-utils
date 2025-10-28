/**
 * Object that can be serialized/deserialized to/from JSON.
 */
export type JsonObject = {
	[key: string]: JsonValue;
};

/**
 * Primitive value that can be serialized/deserialized to/from JSON.
 */
export type JsonPrimitive = boolean | number | string | null | undefined;

/**
 * Data that can be serialized/deserialized to/from JSON.
 */
export type JsonValue = JsonObject | JsonPrimitive | JsonValue[];

/**
 * Object that can be serialized to JSON.
 */
export type JsonSerializableObject =
	| {
			[key: string]: JsonSerializableObject;
	  }
	| {
			toJSON(): JsonSerializableValue[] | JsonValue;
	  };

/**
 * Data that can be serialized to JSON.
 */
export type JsonSerializableValue = JsonSerializableObject | JsonSerializableValue[] | JsonValue;
