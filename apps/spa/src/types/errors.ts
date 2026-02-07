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

export class RepoCreationError extends Error {
  override readonly name = "RepoCreationError" as const;
}
