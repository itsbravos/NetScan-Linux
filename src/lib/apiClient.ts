// Thin fetch wrapper: whenever a protected API route responds 401, notify a
// registered handler so App.tsx can drop back to the login screen. This
// avoids pulling in Context/Redux just for a single global signal.

let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status === 401) {
    unauthorizedHandler?.();
  }
  return res;
}
