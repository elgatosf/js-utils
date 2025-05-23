/**
 * Prevents the modification of existing property attributes and values on the value, and all of its child properties, and prevents the addition of new properties.
 * @param value Value to freeze.
 */
export function freeze<T>(value: T): void {
	if (value !== undefined && value !== null && typeof value === "object" && !Object.isFrozen(value)) {
		Object.freeze(value);
		Object.values(value).forEach(freeze);
	}
}

/**
 * Gets the value at the specified {@link path}.
 * @param source Source object that is being read from.
 * @param path Path to the property to get.
 * @returns Value of the property.
 */
export function get(source: unknown, path: string): unknown {
	const props: string[] = path.split(".");
	return props.reduce((obj, prop) => obj && obj[prop as keyof object], source);
}

/**
 * Determines whether the specified {@link key} exists in the {@link source}.
 * @param source Object to check.
 * @param key key to check for.
 * @param type Optional expected type.
 * @returns `true` when the {@link key} exists in the {@link source}; and when a {@link type} is specified, its type matches.
 */
export function has(source: unknown, key: string, type?: Primitive): boolean {
	if (typeof source === "object" && source !== null && key in source) {
		if (type) {
			return typeof source[key as keyof typeof source] === type;
		} else {
			return true;
		}
	}

	return false;
}

/**
 * Sets the specified `value` on the `target` object at the desired property `path`.
 * @param target The target object that is being written to.
 * @param path The path to the property to set.
 * @param value The value to write.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function set(target: any, path: string, value: unknown): void {
	const props = path.split(".");
	props.reduce((obj, prop, i) => {
		return i === props.length - 1 ? (obj[prop] = value) : obj[prop] || (obj[prop] = {});
	}, target);
}

/**
 * Primitives JavaScript types
 */
type Primitive = "bigint" | "boolean" | "function" | "number" | "object" | "string" | "symbol" | "undefined";
