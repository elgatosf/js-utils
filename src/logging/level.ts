/**
 * Levels of logging.
 */
export const LogLevel = {
	/**
	 * Error message used to indicate an error was thrown, or something critically went wrong.
	 */
	ERROR: level("ERROR", 0),

	/**
	 * Warning message used to indicate something went wrong, but the application is able to recover.
	 */
	WARN: level("WARN", 1),

	/**
	 * Information message for general usage.
	 */
	INFO: level("INFO", 2),

	/**
	 * Debug message used to detail information useful for profiling the applications runtime.
	 */
	DEBUG: level("DEBUG", 4),

	/**
	 * Trace message used to monitor low-level information such as method calls, performance tracking, etc.
	 */
	TRACE: level("TRACE", 5),
};

/**
 * Levels of logging.
 */
export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

/**
 * Creates a log level.
 * @param name Name of the level.
 * @param value Value the level represents.
 * @returns The log level.
 */
function level(name: string, value: number): object {
	return {
		toString: (): string => name,
		valueOf: (): number => value,
	};
}
