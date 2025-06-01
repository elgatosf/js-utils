import { describe, expect, it, vi } from "vitest";

import { RpcClient } from "../client.js";
import { RpcGateway } from "../gateway.js";
import { RpcServer } from "../server.js";

/**
 * Describes {@link RpcGateway}.
 */
describe("RpcGateway", () => {
	/**
	 * Asserts a gateway as a client and server.
	 */
	it("has client and server", () => {
		const gateway = new RpcGateway(vi.fn());
		expect(gateway.client).instanceOf(RpcClient);
		expect(gateway.server).instanceOf(RpcServer);
	});

	/**
	 * Asserts the client and server attempt to receive a message in order.
	 */
	it("propagates receiving message", async () => {
		// Arrange.
		const gateway = new RpcGateway(vi.fn());
		const clientSpy = vi.spyOn(gateway.client, "receive");
		const serverSpy = vi.spyOn(gateway.server, "receive");

		// Act.
		const contextProvider = vi.fn();
		await gateway.receive("foo", contextProvider);

		// Assert.
		expect(clientSpy).toHaveBeenCalledExactlyOnceWith("foo");
		expect(serverSpy).toHaveBeenCalledExactlyOnceWith("foo", contextProvider);
		expect(clientSpy).toHaveBeenCalledBefore(serverSpy);
	});

	/**
	 * Asserts a successful client parse returns true.
	 */
	it("returns success if the client can receive", async () => {
		// Arrange.
		const gateway = new RpcGateway(vi.fn());
		const clientSpy = vi.spyOn(gateway.client, "receive").mockReturnValue(Promise.resolve(true));
		const serverSpy = vi.spyOn(gateway.server, "receive");

		// Act.
		const contextProvider = vi.fn();
		const success = await gateway.receive("foo", contextProvider);

		// Assert.
		expect(success).toBe(true);
		expect(clientSpy).toHaveBeenCalledExactlyOnceWith("foo");
		expect(serverSpy).not.toHaveBeenCalled();
	});

	/**
	 * Asserts a successful server parse returns true.
	 */
	it("returns success if the server can receive", async () => {
		// Arrange.
		const gateway = new RpcGateway(vi.fn());
		const clientSpy = vi.spyOn(gateway.client, "receive");
		const serverSpy = vi.spyOn(gateway.server, "receive").mockReturnValue(Promise.resolve(true));

		// Act.
		const contextProvider = vi.fn();
		const success = await gateway.receive("foo", contextProvider);

		// Assert.
		expect(success).toBe(true);
		expect(clientSpy).toHaveBeenCalledExactlyOnceWith("foo");
		expect(serverSpy).toHaveBeenCalledExactlyOnceWith("foo", contextProvider);
	});
});
