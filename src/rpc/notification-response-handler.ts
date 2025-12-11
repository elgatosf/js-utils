import type { RpcResponseHandler } from "./response-handler.js";

/**
 * Response handler for a notification received from a client.
 */
export class RpcNotificationResponseHandler implements RpcResponseHandler {
	/**
	 * @inheritdoc
	 */
	public get canRespond(): boolean {
		return false;
	}

	/**
	 * @inheritdoc
	 */
	public error(): void {
		// noop
	}

	/**
	 * @inheritdoc
	 */
	public send(): void {
		// noop
	}
}
