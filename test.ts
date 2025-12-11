// stream-example.mjs  (run with: node stream-example.mjs)
import type { ReadableStreamController } from "node:stream/web";

// A controller reference so the writable can enqueue into the readable
let readableController: ReadableStreamController<string> | undefined;

// Create a WHATWG ReadableStream
const readable = new ReadableStream({
	start(controller) {
		readableController = controller;
	},
});

// Create a WHATWG WritableStream
const writable = new WritableStream({
	write(chunk) {
		// Forward the chunk into the ReadableStream
		readableController?.enqueue(chunk);
	},
	close() {
		console.log("close");
		readableController?.close();
	},
});

// Reader to consume data from the readable
const reader = readable.getReader();

// Consume readable and print to console
async function consume() {
	while (true) {
		const { value, done } = await reader.read();
		console.log(done);
		if (done) break;
		console.log("Readable output:", new TextDecoder().decode(value));
	}
}

consume();

// ------ Write data into the writable ------
const writer = writable.getWriter();
writer.write(new TextEncoder().encode("Hello from WritableStream!\n"));
writer.write(new TextEncoder().encode("Another message...\n"));
writer.close();
