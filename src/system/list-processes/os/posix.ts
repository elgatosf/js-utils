import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { ProcessInfo } from "../index.js";

const execFileAsync = promisify(execFile);

/**
 * Uses `ps` which is available on macOS, BSD, and most POSIX systems.
 * @returns A promise that resolves to an array of `ProcessInfo` objects representing the currently running processes on a POSIX-compliant system. Each object contains the PID and the full command line of the process. If the `ps` command fails for any reason, it returns an empty array.
 */
export async function listPosixProcesses(): Promise<ProcessInfo[]> {
	try {
		const { stdout } = await execFileAsync("ps", ["-ax", "-o", "pid=,command="], {
			maxBuffer: 10 * 1024 * 1024,
		});

		return stdout
			.split(/\r?\n/)
			.map((line) => line.trim())
			.filter(Boolean)
			.map((line) => {
				const match = line.match(/^(\d+)\s+(.*)$/);
				return match ? { pid: Number(match[1]), commandLine: match[2] } : undefined;
			})
			.filter((row): row is ProcessInfo => !!row && Number.isFinite(row.pid) && row.pid > 0);
	} catch {
		return [];
	}
}
