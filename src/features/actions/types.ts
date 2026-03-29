export interface Action {
  readonly id: number;
  readonly title: string;
  readonly memo: string;
  readonly state: "open" | "closed";
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly closedAt: string | null;
  readonly url: string;
  readonly labels: readonly string[];
}

export interface CreateActionInput {
  readonly title: string;
  readonly memo?: string;
  readonly labels?: readonly string[];
}

export interface UpdateActionInput {
  readonly title?: string;
  readonly memo?: string;
  readonly state?: "open" | "closed";
  readonly state_reason?: "completed" | "reopened" | "not_planned";
  readonly labels?: readonly string[];
}

export interface GitHubLabel {
  readonly id: number;
  readonly name: string;
  readonly color: string;
  readonly description: string | null;
}

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
  readonly labels?: readonly GitHubLabel[];
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
