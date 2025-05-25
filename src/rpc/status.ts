/**
 * Status code of a response.
 * - `200` the request was successful.
 * - `202` the request was unidirectional, and does not have a response.
 * - `406` the request could not be accepted by the server.
 * - `408` the request timed-out.
 * - `500` the request failed.
 * - `501` the request is not implemented by the server, and could not be fulfilled.
 */
export type StatusCode =
	/**
	 * The request was successful.
	 */
	| 200

	/**
	 * The request was unidirectional, and does not have a response
	 */
	| 202

	/**
	 * The request could not be accepted by the server.
	 */
	| 406

	/**
	 * The request timed-out.
	 */
	| 408

	/**
	 * The request failed with an error.
	 */
	| 500

	/**
	 * The request is not implemented by the server, and could not be fulfilled.
	 */
	| 501;
