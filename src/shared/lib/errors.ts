export class NotFoundError extends Error {
  override readonly name = "NotFoundError" as const;
}

export class RepoNotConfiguredError extends Error {
  override readonly name = "RepoNotConfiguredError" as const;
  constructor() {
    super("ato-datastore repository not found. Please set up the repository first.");
  }
}
