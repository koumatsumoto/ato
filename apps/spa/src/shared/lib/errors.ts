export class AuthError extends Error {
  override readonly name = "AuthError" as const;
}

export class GitHubApiError extends Error {
  override readonly name = "GitHubApiError" as const;
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(`GitHub API error: ${status}`);
  }
}

export class NetworkError extends Error {
  override readonly name = "NetworkError" as const;
}

export class NotFoundError extends Error {
  override readonly name = "NotFoundError" as const;
}

export class RateLimitError extends Error {
  override readonly name = "RateLimitError" as const;
  constructor(readonly resetAt: Date) {
    super(`GitHub API rate limit exceeded. Resets at ${resetAt.toLocaleTimeString()}`);
  }
}

export class RepoNotConfiguredError extends Error {
  override readonly name = "RepoNotConfiguredError" as const;
  constructor() {
    super("ato-datastore repository not found. Please set up the repository first.");
  }
}
