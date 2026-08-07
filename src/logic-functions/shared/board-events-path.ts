/** Builds the crmparser long-poll path, forwarding only the parameters we own. */
export const buildBoardEventsPath = (
  queryStringParameters: Record<string, string | undefined> | null | undefined,
): string => {
  const params = new URLSearchParams();

  const since = queryStringParameters?.since?.trim();
  if (since && /^\d+$/.test(since)) params.set('since', since);

  const epoch = queryStringParameters?.epoch?.trim();
  if (epoch) params.set('epoch', epoch);

  const query = params.toString();
  return query ? `/twenty/events?${query}` : '/twenty/events';
};
