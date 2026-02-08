export interface GitHubIssue {
  readonly number: number;
  readonly title: string;
  readonly body: string | null;
  readonly state: string;
  readonly created_at: string;
  readonly updated_at: string;
  readonly closed_at: string | null;
  readonly html_url: string;
  readonly pull_request?: unknown;
}

export interface GitHubUser {
  readonly login: string;
  readonly id: number;
  readonly avatar_url: string;
}

export interface GitHubRepository {
  readonly id: number;
  readonly name: string;
  readonly full_name: string;
  readonly private: boolean;
  readonly has_issues: boolean;
}

export interface GitHubSearchResult {
  readonly total_count: number;
  readonly incomplete_results: boolean;
  readonly items: readonly GitHubIssue[];
}
