export interface Todo {
  readonly id: number;
  readonly title: string;
  readonly body: string;
  readonly state: "open" | "closed";
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly closedAt: string | null;
  readonly url: string;
}

export interface CreateTodoInput {
  readonly title: string;
  readonly body?: string;
}

export interface UpdateTodoInput {
  readonly title?: string;
  readonly body?: string;
  readonly state?: "open" | "closed";
  readonly state_reason?: "completed" | "reopened" | "not_planned";
}
