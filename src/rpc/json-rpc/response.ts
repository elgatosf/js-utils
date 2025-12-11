import { z } from "zod/v4-mini";

import { JsonRpcErrorResponse } from "./error-response.js";
import { JsonRpcSuccessResponse } from "./success-response.js";

/**
 * Response object sent to a client.
 */
export const JsonRpcResponse = z.union([JsonRpcSuccessResponse, JsonRpcErrorResponse]);

/**
 * Response object sent to a client.
 */
export type JsonRpcResponse = JsonRpcErrorResponse | JsonRpcSuccessResponse;
