import type { JsonValue } from "../json.js";

/**
 * Proxy capable of sending requests or responses to a client or server.
 * @param value Request or response to send.
 * @returns `true` when the proxy was able to send the value; otherwise `false`.
 */
export type RpcProxy = (value: JsonValue) => Promise<boolean> | boolean;
