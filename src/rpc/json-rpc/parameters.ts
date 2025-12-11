import type { JsonObject, JsonValue } from "../../json.js";

/**
 * Parameters sent with a request.
 */
export type JsonRpcParameters = JsonObject | JsonValue[] | undefined;
