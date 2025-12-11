import type { JsonObject, JsonValue } from "../../json.js";

/**
 * Result sent with a response.
 */
export type JsonRpcResult = JsonObject | JsonValue[] | boolean | number | string | null;
