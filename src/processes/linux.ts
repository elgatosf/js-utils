import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { listPosixProcesses } from "./darwin.js";
import type { ProcessInfo } from "./process-info.js";

/**
 * Reads `/proc/[pid]/cmdline` for each numeric entry in `/proc`.
 * This is a pure Node.js approach (no child process spawning).
 * @returns A promise that resolves to an array of `ProcessInfo` objects representing the currently running processes on a Linux system. Each object contains the PID and the full command line of the process. If `/proc` is unavailable (e.g., in a containerized environment), it falls back to using `ps`.
 */
export async function getLinuxProcesses(): Promise<ProcessInfo[]> {
	try {
		const entries = await readdir("/proc");
		const results: ProcessInfo[] = [];

		const numericEntries = entries.filter((entry) => /^\d+$/.test(entry));
		for (const entry of numericEntries) {
			try {
				const cmdline = await readFile(join("/proc", entry, "cmdline"), "utf8");
				if (cmdline) {
					results.push({
						pid: Number(entry),
						// cmdline uses null bytes as argument separators
						commandLine: cmdline.replace(/\0/g, " ").trim(),
					});
				}
			} catch (error) {
				console.error(`Failed to read /proc/${entry}/cmdline:`, error);
			}
		}

		return results;
	} catch {
		// Fall back to POSIX ps if /proc is unavailable
		return listPosixProcesses();
	}
}
