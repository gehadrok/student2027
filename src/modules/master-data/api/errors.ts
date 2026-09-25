/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PG-5 — Master Data REST API: shared error type and response helper.
 *
 * Keeps HTTP status codes explicit so the controller layer stays a thin
 * adapter. The API never returns raw stack traces; it returns a consistent
 * `ErrorResponse` shape: { error, details? }.
 */

export class ApiError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export interface ErrorResponse {
  error: string;
  details?: unknown;
}

/**
 * Map any error thrown by the service layer to a consistent JSON response.
 * `ApiError` carries an explicit status; everything else is treated as a
 * 400 (bad request / unexpected).
 */
export function sendError(res: { status(code: number): { json(body: unknown): void } }, err: unknown): void {
  if (err instanceof ApiError) {
    const body: ErrorResponse = { error: err.message };
    if (err.details !== undefined) body.details = err.details;
    res.status(err.status).json(body);
    return;
  }
  const message = err instanceof Error ? err.message : 'Unknown error';
  res.status(400).json({ error: message } as ErrorResponse);
}
