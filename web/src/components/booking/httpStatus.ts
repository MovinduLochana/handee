/** HTTP status of an axios error, or undefined for network/non-HTTP errors. */
export function getHttpStatus(error: unknown): number | undefined {
  return (error as { response?: { status?: number } } | null)?.response?.status;
}

/** Retry transient failures (network, 5xx) but not 4xx like 403/404. */
export function retryUnlessClientError(failureCount: number, error: unknown): boolean {
  const status = getHttpStatus(error);
  return (status === undefined || status >= 500) && failureCount < 3;
}
