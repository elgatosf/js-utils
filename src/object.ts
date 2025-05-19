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
 * @param path Path to the property to get.
 * @param source Source object that is being read from.
 * @returns Value of the property.
 */
export function get(path: string, source: unknown): unknown {
	const props: string[] = path.split(".");
	return props.reduce((obj, prop) => obj && obj[prop as keyof object], source);
}

/**
 * Sets the specified `value` on the `target` object at the desired property `path`.
 * @param path The path to the property to set.
 * @param target The target object that is being written to.
 * @param value The value to write.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function set(path: string, target: any, value: unknown): void {
	const props = path.split(".");
	props.reduce((obj, prop, i) => {
		return i === props.length - 1 ? (obj[prop] = value) : obj[prop] || (obj[prop] = {});
	}, target);
}
