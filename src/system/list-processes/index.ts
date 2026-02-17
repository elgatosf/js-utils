import { listLinuxProcesses } from "./os/linux.js";
import { listPosixProcesses } from "./os/posix.js";
import { listWindowsProcesses } from "./os/win32.js";

/**
 * Represents a running process with its PID and command line.
 */
export type ProcessInfo = {
	/**
	 * The process ID (PID) of the running process. This is a positive integer that uniquely identifies the process on the system.
	 */
	pid: number;
	/**
	 * The full command line used to start the process, including the executable name and any arguments. This is a string that may contain spaces and should be treated as a single command line.
	 */
	commandLine: string;
};

/**
 * Lists running processes cross-platform using built-in Node.js modules.
 * - Linux: reads `/proc` filesystem directly (no child process)
 * - macOS: uses `ps` (no `/proc` on macOS)
 * - Windows: uses PowerShell `Get-CimInstance`
 * @returns A promise that resolves to an array of `ProcessInfo` objects representing the currently running processes on the system.
 */
export async function listProcesses(): Promise<ProcessInfo[]> {
	switch (process.platform) {
		case "win32":
			return listWindowsProcesses();
		case "linux":
			return listLinuxProcesses();
		default:
			return listPosixProcesses();
	}
}
