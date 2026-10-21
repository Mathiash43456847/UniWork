/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Standard authenticated fetch client for UniWork.
 * Ensures credentials (session cookies) and the anti-CSRF request header
 * are always transmitted with state-changing and protected queries.
 */
export function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers || {});
  if (!headers.has('x-uniwork-request')) {
    headers.set('x-uniwork-request', '1');
  }
  return fetch(input, {
    ...init,
    credentials: 'include',
    headers,
  });
}
