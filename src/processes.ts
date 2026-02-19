import { listPosixProcesses as getDarwinProcesses } from "./processes/darwin.js";
import { getLinuxProcesses } from "./processes/linux.js";
import type { ProcessInfo } from "./processes/process-info.js";
import { getWindowsProcesses } from "./processes/win32.js";

/**
 * Lists running processes in a cross-platform way.
 * - Linux: reads the `/proc` filesystem directly (no child process or external command)
 * - macOS: spawns the `ps` command (requires `ps` to be available on the system)
 * - Windows: spawns PowerShell to run `Get-CimInstance` (requires PowerShell to be available on the system)
 * @returns A promise that resolves to an array of `ProcessInfo` objects representing the currently running processes on the system.
 */
export async function getProcesses(): Promise<ProcessInfo[]> {
	switch (process.platform) {
		case "win32":
			return getWindowsProcesses();
		case "linux":
			return getLinuxProcesses();
		case "darwin":
			return getDarwinProcesses();
		default:
			throw new Error(`Unsupported platform: ${process.platform}`);
	}
}
