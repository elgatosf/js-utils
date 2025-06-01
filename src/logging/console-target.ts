import type { LogEntry, LogTarget } from "./target.js";

/**
 * Provides a {@link LogTarget} that logs to the console.
 */
export class ConsoleTarget implements LogTarget {
	/**
	 * @inheritdoc
	 */
	public write(entry: LogEntry): void {
		switch (entry.level) {
			case "error":
				console.error(...entry.data);
				break;

			case "warn":
				console.warn(...entry.data);
				break;

			default:
				console.log(...entry.data);
		}
	}
}
