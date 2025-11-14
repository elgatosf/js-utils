import { beforeAll, describe, expect, it, vi } from "vitest";

import { type LogEntry, Logger, type LoggerOptions, LogLevel, type LogTarget } from "../index.js";

describe("Logger", () => {
	/**
	 * Asserts the {@link Logger} clones options on construction.
	 */
	it("clones options on construction", () => {
		// Arrange.
		const options: LoggerOptions = {
			level: LogLevel.ERROR,
			targets: [{ write: vi.fn() }],
		};

		const logger = new Logger(options);

		// Act.
		logger.setLevel(LogLevel.INFO);
		logger.info("Hello world");

		// Assert
		expect(logger.level).toBe(LogLevel.INFO);
		expect(options.level).toBe(LogLevel.ERROR);
		expect(options.targets[0].write).toHaveBeenCalledTimes(1);
		expect(options.targets[0].write).toHaveBeenCalledWith<[LogEntry]>({
			data: ["Hello world"],
			level: LogLevel.INFO,
			scope: "",
		});
	});

	/**
	 * Asserts {@link Logger.write} logs to all targets
	 */
	it("writes to all targets", () => {
		// Arrange.
		const options: LoggerOptions = {
			level: LogLevel.INFO,
			targets: [{ write: vi.fn() }, { write: vi.fn() }, { write: vi.fn() }],
		};

		const logger = new Logger(options);

		// Act.
		logger.info("Hello world");

		// Assert
		const entry: LogEntry = {
			data: ["Hello world"],
			level: LogLevel.INFO,
			scope: "",
		};

		expect(options.targets[0].write).toBeCalledTimes(1);
		expect(options.targets[0].write).toHaveBeenCalledWith(entry);
		expect(options.targets[1].write).toBeCalledTimes(1);
		expect(options.targets[1].write).toHaveBeenCalledWith(entry);
		expect(options.targets[2].write).toBeCalledTimes(1);
		expect(options.targets[2].write).toHaveBeenCalledWith(entry);
	});

	/**
	 * Asserts {@link Logger} correctly supplies all log entry data.
	 */
	describe("supplies all log entry data", () => {
		it.each([
			{
				scopes: [],
				scope: "",
			},
			{
				scopes: ["Foo "],
				scope: "Foo",
			},
			{
				scopes: ["Foo", "  "],
				scope: "Foo",
			},
			{
				scopes: [" Hello", "World"],
				scope: "Hello->World",
			},
			{
				scopes: ["One", " Two ", "Three"],
				scope: "One->Two->Three",
			},
		])("When scopes are $scopes", ({ scopes, scope }) => {
			// Arrange.
			const target = { write: vi.fn() };
			const parent = new Logger({
				level: LogLevel.TRACE,
				minimumLevel: LogLevel.TRACE,
				targets: [target],
			});

			const logger = scopes.reduce((prev, current) => prev.createScope(current), parent);

			// Act.
			logger.error("Log error", new Error(LogLevel.ERROR.toString()));
			logger.warn("Log warn", new Error(LogLevel.WARN.toString()));
			logger.info("Log info", new Error(LogLevel.INFO.toString()));
			logger.debug("Log debug", new Error(LogLevel.DEBUG.toString()));
			logger.trace("Log trace", new Error(LogLevel.TRACE.toString()));

			// Assert.
			expect(target.write).toHaveBeenCalledTimes(5);
			expect(target.write).toHaveBeenNthCalledWith<[LogEntry]>(1, {
				level: LogLevel.ERROR,
				data: [
					"Log error",
					expect.objectContaining({
						message: LogLevel.ERROR.toString(),
					}),
				],
				scope,
			});

			expect(target.write).toHaveBeenNthCalledWith<[LogEntry]>(2, {
				level: LogLevel.WARN,
				data: [
					"Log warn",
					expect.objectContaining({
						message: LogLevel.WARN.toString(),
					}),
				],
				scope,
			});

			expect(target.write).toHaveBeenNthCalledWith<[LogEntry]>(3, {
				level: LogLevel.INFO,
				data: [
					"Log info",
					expect.objectContaining({
						message: LogLevel.INFO.toString(),
					}),
				],
				scope,
			});

			expect(target.write).toHaveBeenNthCalledWith<[LogEntry]>(4, {
				level: LogLevel.DEBUG,
				data: [
					"Log debug",
					expect.objectContaining({
						message: LogLevel.DEBUG.toString(),
					}),
				],
				scope,
			});

			expect(target.write).toHaveBeenNthCalledWith<[LogEntry]>(5, {
				level: LogLevel.TRACE,
				data: [
					"Log trace",
					expect.objectContaining({
						message: LogLevel.TRACE.toString(),
					}),
				],
				scope,
			});
		});
	});

	/**
	 * Asserts {@link Logger} only writes messages to the {@link LogTarget} when the log-level is allowed.
	 */
	describe("checks the log level before forwarding to target", () => {
		let level: LogLevel;

		describe("error", () => {
			beforeAll(() => (level = LogLevel.ERROR));

			it("does log ERROR", () => verify((logger) => logger.error(LogLevel.ERROR), true));
			it("does not log WARN", () => verify((logger) => logger.warn(LogLevel.WARN), false));
			it("does not log INFO", () => verify((logger) => logger.info(LogLevel.INFO), false));
			it("does not log DEBUG", () => verify((logger) => logger.debug(LogLevel.DEBUG), false));
			it("does not log TRACE", () => verify((logger) => logger.trace(LogLevel.TRACE), false));
		});

		describe("warn", () => {
			beforeAll(() => (level = LogLevel.WARN));

			it("does log ERROR", () => verify((logger) => logger.error(LogLevel.ERROR), true));
			it("does log WARN", () => verify((logger) => logger.warn(LogLevel.WARN), true));
			it("does not log INFO", () => verify((logger) => logger.info(LogLevel.INFO), false));
			it("does not log DEBUG", () => verify((logger) => logger.debug(LogLevel.DEBUG), false));
			it("does not log TRACE", () => verify((logger) => logger.trace(LogLevel.TRACE), false));
		});

		describe("info", () => {
			beforeAll(() => (level = LogLevel.INFO));

			it("does log ERROR", () => verify((logger) => logger.error(LogLevel.ERROR), true));
			it("does log WARN", () => verify((logger) => logger.warn(LogLevel.WARN), true));
			it("does log INFO", () => verify((logger) => logger.info(LogLevel.INFO), true));
			it("does not log DEBUG", () => verify((logger) => logger.debug(LogLevel.DEBUG), false));
			it("does not log TRACE", () => verify((logger) => logger.trace(LogLevel.TRACE), false));
		});

		describe("debug", () => {
			beforeAll(() => (level = LogLevel.DEBUG));

			it("does log ERROR", () => verify((logger) => logger.error(LogLevel.ERROR), true));
			it("does log WARN", () => verify((logger) => logger.warn(LogLevel.WARN), true));
			it("does log INFO", () => verify((logger) => logger.info(LogLevel.INFO), true));
			it("does log DEBUG", () => verify((logger) => logger.debug(LogLevel.DEBUG), true));
			it("does not log TRACE", () => verify((logger) => logger.trace(LogLevel.TRACE), false));
		});

		describe("trace", () => {
			beforeAll(() => (level = LogLevel.TRACE));

			it("does log ERROR", () => verify((logger) => logger.error(LogLevel.ERROR), true));
			it("does log WARN", () => verify((logger) => logger.warn(LogLevel.WARN), true));
			it("does log INFO", () => verify((logger) => logger.info(LogLevel.INFO), true));
			it("does log DEBUG", () => verify((logger) => logger.debug(LogLevel.DEBUG), true));
			it("does log TRACE", () => verify((logger) => logger.trace(LogLevel.TRACE), true));
		});

		/**
		 * Asserts {@link Logger} correctly does, or does not, log a message of a specific level, based on the {@link LogLevel} associated with the logger.
		 * @param act Function responsible for logging to the {@link Logger}, e.g. {@link Logger.error}, {@link Logger.warn}, etc.
		 * @param expectLog Whether a log was expected to be written.
		 */
		function verify(act: (logger: Logger) => void, expectLog: boolean) {
			// Arrange.
			const target = { write: vi.fn() };
			const logger = new Logger({
				level,
				minimumLevel: LogLevel.TRACE,
				targets: [target],
			});

			// Act.
			act(logger);

			// Assert.
			expect(target.write).toHaveBeenCalledTimes(expectLog ? 1 : 0);
		}
	});

	describe("setLogLevel", () => {
		/**
		 * Asserts scoped {@link Logger} inherit the {@link LogLevel} of their parent.
		 */
		it("inherited by scoped loggers", () => {
			// Arrange.
			const parent = new Logger({
				level: LogLevel.ERROR,
				targets: [{ write: vi.fn() }],
			});

			// Act.
			const childBefore = parent.createScope("Child (Before)");
			const grandchildBefore = childBefore.createScope("Grandchild (Before)");

			parent.setLevel(LogLevel.INFO);
			const childAfter = parent.createScope("Child (After)");

			// Assert.
			expect(parent.level).toBe(LogLevel.INFO);
			expect(childBefore.level).toBe(LogLevel.INFO);
			expect(grandchildBefore.level).toBe(LogLevel.INFO);
			expect(childAfter.level).toBe(LogLevel.INFO);
		});

		/**
		 * Asserts scoped {@link Logger} inherit the {@link LogLevel} of their earliest parent that has an explicit {@link LogLevel} defined.
		 */
		it("inherited from parents with defined log-level", () => {
			// Arrange.
			const parent = new Logger({
				level: LogLevel.ERROR,
				targets: [{ write: vi.fn() }],
			});

			// Act.
			const child = parent.createScope("Child");
			const grandchild = child.createScope("Grandchild");

			child.setLevel(LogLevel.WARN);
			parent.setLevel(LogLevel.INFO);

			// Assert.
			expect(parent.level).toBe(LogLevel.INFO);
			expect(child.level).toBe(LogLevel.WARN);
			expect(grandchild.level).toBe(LogLevel.WARN);
		});

		/**
		 * Asserts scoped {@link Logger} inherit the {@link LogLevel}, from their parent, when resetting the {@link LogLevel}.
		 */
		it("defaults when set to undefined", () => {
			// Arrange.
			const parent = new Logger({
				level: LogLevel.ERROR,
				targets: [{ write: vi.fn() }],
			});

			// Act (1).
			const child = parent.createScope("Child");
			const grandchild = child.createScope("Grandchild");

			child.setLevel(LogLevel.WARN);
			parent.setLevel(LogLevel.INFO);
			child.setLevel();

			// Assert (1).
			expect(parent.level).toBe(LogLevel.INFO);
			expect(child.level).toBe(LogLevel.INFO);
			expect(grandchild.level).toBe(LogLevel.INFO);
		});
	});

	/**
	 * Asserts validating the {@link LogLevel} can be set based on the environment.
	 */
	describe("log-level validation", () => {
		const testCases = [
			{
				minimumLevel: LogLevel.INFO,
				name: "Can be ERROR",
				level: LogLevel.ERROR,
				expected: LogLevel.ERROR,
			},
			{
				minimumLevel: LogLevel.TRACE,
				name: "Can be ERROR",
				level: LogLevel.ERROR,
				expected: LogLevel.ERROR,
			},
			{
				minimumLevel: LogLevel.INFO,
				name: "Can be WARN",
				level: LogLevel.WARN,
				expected: LogLevel.WARN,
			},
			{
				minimumLevel: LogLevel.TRACE,
				name: "Can be WARN",
				level: LogLevel.WARN,
				expected: LogLevel.WARN,
			},
			{
				minimumLevel: LogLevel.INFO,
				name: "Can be INFO",
				level: LogLevel.INFO,
				expected: LogLevel.INFO,
			},
			{
				minimumLevel: LogLevel.TRACE,
				name: "Can be INFO",
				level: LogLevel.INFO,
				expected: LogLevel.INFO,
			},
			{
				minimumLevel: LogLevel.INFO,
				name: "Cannot be DEBUG",
				level: LogLevel.DEBUG,
				expected: LogLevel.INFO,
			},
			{
				minimumLevel: LogLevel.TRACE,
				name: "Can be DEBUG",
				level: LogLevel.DEBUG,
				expected: LogLevel.DEBUG,
			},
			{
				minimumLevel: LogLevel.INFO,
				name: "Cannot be TRACE",
				level: LogLevel.TRACE,
				expected: LogLevel.INFO,
			},
			{
				minimumLevel: LogLevel.TRACE,
				name: "Can be TRACE",
				level: LogLevel.TRACE,
				expected: LogLevel.TRACE,
			},
		];

		/**
		 * Asserts the {@link Logger} validates the {@link LogLevel} on construction.
		 */
		describe("construction", () => {
			it.each(testCases)("$name when minimumLevel is $minimumLevel", ({ level, expected, minimumLevel }) => {
				// Arrange.
				const options: LoggerOptions = {
					level,
					minimumLevel,
					targets: [{ write: vi.fn() }],
				};

				// Act.
				const logger = new Logger(options);

				// Assert.
				expect(logger.level).toBe(expected);
			});
		});

		/**
		 * Asserts {@link Logger.setLogLevel} validates teh {@link LogLevel}.
		 */
		describe("setLevel", () => {
			it.each(testCases)("$name when minimumLevel is $minimumLevel", ({ level, expected, minimumLevel }) => {
				// Arrange.
				const options: LoggerOptions = {
					level: LogLevel.ERROR,
					minimumLevel,
					targets: [{ write: vi.fn() }],
				};

				const logger = new Logger(options);

				// Act.
				logger.setLevel(level);

				// Assert.
				expect(logger.level).toBe(expected);
			});
		});
	});
});
