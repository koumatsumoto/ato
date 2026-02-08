export interface Action {
  readonly id: number;
  readonly title: string;
  readonly body: string;
  readonly state: "open" | "closed";
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly closedAt: string | null;
  readonly url: string;
}

export interface CreateActionInput {
  readonly title: string;
  readonly body?: string;
}

export interface UpdateActionInput {
  readonly title?: string;
  readonly body?: string;
  readonly state?: "open" | "closed";
  readonly state_reason?: "completed" | "reopened" | "not_planned";
}
