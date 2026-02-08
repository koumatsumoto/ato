export interface PaginationInfo {
  readonly hasNextPage: boolean;
  readonly nextPage: number | null;
}

export function parseLinkHeader(header: string | null): PaginationInfo {
  if (!header) return { hasNextPage: false, nextPage: null };

  const nextMatch = header.match(/<[^>]*[?&]page=(\d+)[^>]*>;\s*rel="next"/);
  if (!nextMatch) return { hasNextPage: false, nextPage: null };

  return {
    hasNextPage: true,
    nextPage: Number(nextMatch[1]),
  };
}
