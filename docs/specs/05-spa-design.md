# 05. SPA 設計

## 概要

React 19 + Vite 6 + TailwindCSS 4 の SPA。GitHub Pages にデプロイする。
「超絶シンプル」「高速・軽快」が最重要 UX 方針。

SPA がビジネスロジックの全てを担う: GitHub API 直接呼び出し、Todo CRUD、リポジトリ自動作成、エラーハンドリング。

---

## 1. ルート構成

React Router v7 (declarative mode) を使用。

| パス         | コンポーネント  | 認証 | 説明                            |
| ------------ | --------------- | ---- | ------------------------------- |
| `/`          | `MainPage`      | 必須 | 未完了 TODO 一覧 + 追加フォーム |
| `/login`     | `LoginPage`     | 不要 | ログインボタン表示              |
| `/todos/:id` | `DetailPage`    | 必須 | TODO 詳細・編集                 |
| `/completed` | `CompletedPage` | 必須 | 完了済み一覧                    |

### ルーティング設定

```typescript
// router.tsx
import { createBrowserRouter } from "react-router";

export const router = createBrowserRouter(
  [
    {
      element: <AuthGuard />,
      children: [
        { path: "/", element: <MainPage /> },
        { path: "/todos/:id", element: <DetailPage /> },
        { path: "/completed", element: <CompletedPage /> },
      ],
    },
    { path: "/login", element: <LoginPage /> },
  ],
  { basename: import.meta.env.BASE_URL },
);
```

### GitHub Pages SPA 対応

GitHub Pages は SPA ルーティングをサポートしないため、`public/404.html` でリダイレクト。

```html
<!-- public/404.html -->
<!DOCTYPE html>
<html>
  <head>
    <script>
      // 404 を index.html にリダイレクト (パスを保持)
      const path = window.location.pathname;
      const search = window.location.search;
      const hash = window.location.hash;
      window.location.replace(window.location.origin + "/?redirect=" + encodeURIComponent(path + search + hash));
    </script>
  </head>
</html>
```

---

## 2. コンポーネントツリー

```text
App
  RouterProvider
    AuthGuard              -- 認証チェック、未認証なら /login へ
      Layout
        Header             -- アプリ名、ユーザーアバター、ログアウト
        <Outlet />
          MainPage
            TodoAddForm    -- 1 行入力 + 追加ボタン
            TodoList       -- TodoItem の一覧
              TodoItem     -- タイトル、完了チェック、詳細遷移
            TodoEmptyState -- 0 件時のメッセージ
            CompletedLink  -- 「完了済みを見る」リンク (控えめ)
          DetailPage
            DetailHeader   -- 戻るボタン、完了トグル
            DetailForm     -- タイトル編集、メモ編集、保存ボタン
          CompletedPage
            CompletedList  -- 完了済み TodoItem 一覧
            LoadMoreButton -- 追加読み込みボタン
    LoginPage              -- ログインボタンのみ
```

### 各コンポーネント詳細

#### App

```typescript
// app/App.tsx
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  );
}
```

#### AuthGuard

認証状態をチェックし、未認証なら `/login` にリダイレクト。

```typescript
function AuthGuard() {
  const { state } = useAuth();

  if (state.isLoading) return <PageSkeleton />;
  if (!state.token) return <Navigate to="/login" replace />;

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}
```

#### Layout / Header

```typescript
function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-6">{children}</main>
    </div>
  );
}

function Header() {
  const { state, logout } = useAuth();
  return (
    <header className="border-b bg-white px-4 py-3">
      <div className="mx-auto flex max-w-2xl items-center justify-between">
        <h1 className="text-lg font-semibold">ATO</h1>
        {state.user && (
          <div className="flex items-center gap-3">
            <img src={state.user.avatarUrl} alt="" className="h-7 w-7 rounded-full" />
            <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-700">
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
```

#### TodoAddForm

入力 -> Enter で即追加。追加後フォーカス維持。

```typescript
function TodoAddForm() {
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const createTodo = useCreateTodo();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    createTodo.mutate({ title: trimmed });
    setTitle("");
    inputRef.current?.focus();
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        ref={inputRef}
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add a todo..."
        className="flex-1 rounded-lg border px-4 py-2 focus:border-blue-500 focus:outline-none"
        maxLength={256}
        autoFocus
      />
      <button
        type="submit"
        disabled={!title.trim() || createTodo.isPending}
        className="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
      >
        Add
      </button>
    </form>
  );
}
```

#### TodoItem

タイトル表示、完了チェックボックス、クリックで詳細遷移。

```typescript
function TodoItem({ todo }: { todo: Todo }) {
  const navigate = useNavigate();
  const closeTodo = useCloseTodo();
  const reopenTodo = useReopenTodo();

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (todo.state === "open") {
      closeTodo.mutate(todo.id);
    } else {
      reopenTodo.mutate(todo.id);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/todos/${todo.id}`)}
      onKeyDown={(e) => e.key === "Enter" && navigate(`/todos/${todo.id}`)}
      className="flex items-center gap-3 rounded-lg border bg-white px-4 py-3 hover:bg-gray-50 cursor-pointer"
    >
      <button
        onClick={handleToggle}
        aria-label={todo.state === "open" ? "Mark as complete" : "Mark as incomplete"}
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 hover:border-blue-500"
      >
        {todo.state === "closed" && <CheckIcon />}
      </button>
      <span className={todo.state === "closed" ? "line-through text-gray-400" : ""}>
        {todo.title}
      </span>
    </div>
  );
}
```

#### DetailPage

タイトル・メモの編集、完了トグル、戻る。

```typescript
function DetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: todo, isLoading } = useTodo(Number(id));
  const updateTodo = useUpdateTodo();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  // todo がロードされたら初期値をセット
  useEffect(() => {
    if (todo) {
      setTitle(todo.title);
      setBody(todo.body);
    }
  }, [todo]);

  const handleSave = () => {
    if (!todo) return;
    updateTodo.mutate(
      { id: todo.id, title, body },
      { onSuccess: () => setIsDirty(false) },
    );
  };

  if (isLoading) return <DetailSkeleton />;
  if (!todo) return <NotFound />;

  return (
    <div className="space-y-4">
      <button onClick={() => navigate(-1)} className="text-sm text-gray-500">
        Back
      </button>
      <input
        type="text"
        value={title}
        onChange={(e) => { setTitle(e.target.value); setIsDirty(true); }}
        className="w-full rounded-lg border px-4 py-2 text-lg font-semibold"
        maxLength={256}
      />
      <textarea
        value={body}
        onChange={(e) => { setBody(e.target.value); setIsDirty(true); }}
        placeholder="Add a note..."
        className="w-full rounded-lg border px-4 py-3 min-h-[200px] resize-y"
        maxLength={65536}
      />
      <div className="flex items-center justify-between">
        <CompletionToggle todo={todo} />
        <button
          onClick={handleSave}
          disabled={!isDirty || updateTodo.isPending}
          className="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
        >
          {updateTodo.isPending ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
```

#### CompletedPage

完了済み一覧。Load more ボタンでページネーション。

```typescript
function CompletedPage() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useClosedTodos();

  const todos = data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-600">Completed</h2>
      {isLoading ? (
        <ListSkeleton />
      ) : todos.length === 0 ? (
        <p className="text-center text-gray-400 py-8">No completed todos</p>
      ) : (
        <>
          <div className="space-y-2">
            {todos.map((todo) => (
              <TodoItem key={todo.id} todo={todo} />
            ))}
          </div>
          {hasNextPage && (
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="w-full py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              {isFetchingNextPage ? "Loading..." : "Load more"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
```

---

## 3. GitHub API クライアント

SPA から GitHub REST API を直接呼び出す。全てのビジネスロジックは SPA 内で完結する。

### 3.1 ベースクライアント

```typescript
// shared/lib/github-client.ts
const GITHUB_API = "https://api.github.com";

async function githubFetch(path: string, options?: RequestInit): Promise<Response> {
  const token = localStorage.getItem("ato:token");
  if (!token) {
    throw new AuthError("Not authenticated");
  }

  const response = await fetch(`${GITHUB_API}${path}`, {
    ...options,
    headers: {
      ...options?.headers,
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (response.status === 401) {
    localStorage.removeItem("ato:token");
    throw new AuthError("Token expired or revoked");
  }

  return response;
}
```

### 3.2 Todo API 関数

```typescript
// features/todos/lib/github-api.ts
const REPO_NAME = "ato-datastore";

function repoPath(login: string): string {
  return `/repos/${login}/${REPO_NAME}`;
}

/** Todo 一覧取得 */
async function fetchTodos(
  login: string,
  params: {
    state?: "open" | "closed";
    perPage?: number;
    page?: number;
    sort?: "created" | "updated";
    direction?: "asc" | "desc";
  },
): Promise<{ todos: Todo[]; hasNextPage: boolean; nextPage: number | null }> {
  const query = new URLSearchParams({
    state: params.state ?? "open",
    per_page: String(params.perPage ?? 30),
    page: String(params.page ?? 1),
    sort: params.sort ?? "updated",
    direction: params.direction ?? "desc",
  });

  const response = await githubFetch(`${repoPath(login)}/issues?${query}`);

  if (!response.ok) {
    throw new GitHubApiError(response.status, await response.json());
  }

  const issues: GitHubIssue[] = await response.json();

  // Pull Request を除外 (GitHub Issues API は PR も返す)
  const todos = issues.filter((issue) => !issue.pull_request).map(mapIssueToTodo);

  const linkHeader = response.headers.get("Link");
  const { hasNextPage, nextPage } = parseLinkHeader(linkHeader);

  return { todos, hasNextPage, nextPage };
}

/** Todo 作成 */
async function createTodo(login: string, input: CreateTodoInput): Promise<Todo> {
  const response = await githubFetch(`${repoPath(login)}/issues`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: input.title,
      body: input.body,
    }),
  });

  if (!response.ok) {
    throw new GitHubApiError(response.status, await response.json());
  }

  return mapIssueToTodo(await response.json());
}

/** Todo 詳細取得 */
async function fetchTodo(login: string, id: number): Promise<Todo> {
  const response = await githubFetch(`${repoPath(login)}/issues/${id}`);

  if (!response.ok) {
    throw new GitHubApiError(response.status, await response.json());
  }

  const issue: GitHubIssue = await response.json();
  if (issue.pull_request) {
    throw new NotFoundError("Not a todo item");
  }

  return mapIssueToTodo(issue);
}

/** Todo 更新 */
async function updateTodo(login: string, id: number, input: UpdateTodoInput): Promise<Todo> {
  const response = await githubFetch(`${repoPath(login)}/issues/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new GitHubApiError(response.status, await response.json());
  }

  return mapIssueToTodo(await response.json());
}

/** Todo 完了 */
async function closeTodo(login: string, id: number): Promise<Todo> {
  return updateTodo(login, id, {
    state: "closed",
    state_reason: "completed",
  });
}

/** Todo 再オープン */
async function reopenTodo(login: string, id: number): Promise<Todo> {
  return updateTodo(login, id, {
    state: "open",
    state_reason: "reopened",
  });
}
```

### 3.3 Issue -> Todo 変換

```typescript
// features/todos/lib/issue-mapper.ts
function mapIssueToTodo(issue: GitHubIssue): Todo {
  return {
    id: issue.number,
    title: issue.title,
    body: issue.body ?? "",
    state: issue.state as "open" | "closed",
    createdAt: issue.created_at,
    updatedAt: issue.updated_at,
    closedAt: issue.closed_at,
    url: issue.html_url,
  };
}
```

### 3.4 ページネーション

```typescript
// features/todos/lib/pagination.ts
function parseLinkHeader(header: string | null): {
  hasNextPage: boolean;
  nextPage: number | null;
} {
  if (!header) return { hasNextPage: false, nextPage: null };

  const nextMatch = header.match(/<[^>]*[?&]page=(\d+)[^>]*>;\s*rel="next"/);
  if (!nextMatch) return { hasNextPage: false, nextPage: null };

  return {
    hasNextPage: true,
    nextPage: Number(nextMatch[1]),
  };
}
```

### 3.5 リポジトリ自動作成

```typescript
// features/todos/lib/repo-init.ts
const REPO_INITIALIZED_KEY = "ato:repo-initialized";

async function ensureRepository(login: string): Promise<void> {
  // localStorage キャッシュ確認
  if (localStorage.getItem(REPO_INITIALIZED_KEY) === "true") {
    return;
  }

  // リポジトリ存在確認
  const checkRes = await githubFetch(`/repos/${login}/ato-datastore`);
  if (checkRes.ok) {
    localStorage.setItem(REPO_INITIALIZED_KEY, "true");
    return;
  }

  if (checkRes.status !== 404) {
    throw new GitHubApiError(checkRes.status, await checkRes.json());
  }

  // リポジトリ作成
  const createRes = await githubFetch("/user/repos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "ato-datastore",
      private: true,
      description: "Data store for ATO app",
      auto_init: true,
      has_issues: true,
      has_projects: false,
      has_wiki: false,
    }),
  });

  if (createRes.ok || createRes.status === 422) {
    // 422 = 既に存在 (競合状態への対応)
    localStorage.setItem(REPO_INITIALIZED_KEY, "true");
    return;
  }

  throw new RepoCreationError("Failed to create ato-datastore repository");
}
```

### 3.6 トークン管理

```typescript
// features/auth/lib/token-store.ts
const TOKEN_KEY = "ato:token";
const USER_KEY = "ato:user";

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem("ato:repo-initialized");
}

function isAuthenticated(): boolean {
  return getToken() !== null;
}
```

---

## 4. 状態管理

### 4.1 認証状態: AuthContext

```typescript
// features/auth/hooks/use-auth.ts
interface AuthState {
  readonly token: string | null;
  readonly user: AuthUser | null;
  readonly isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getToken());

  // token がある場合、GitHub API でユーザー情報を取得
  const { data: user, isLoading } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const response = await githubFetch("/user");
      if (!response.ok) throw new AuthError("Failed to fetch user");
      const data = await response.json();
      return {
        login: data.login,
        id: data.id,
        avatarUrl: data.avatar_url,
      } as AuthUser;
    },
    enabled: !!token,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 分
  });

  // ...
}
```

### 4.2 サーバー状態: TanStack Query

```typescript
// features/todos/hooks/use-todos.ts

/** 未完了一覧 */
function useOpenTodos() {
  const { state } = useAuth();
  return useQuery({
    queryKey: ["todos", "open"],
    queryFn: () =>
      fetchTodos(state.user!.login, {
        state: "open",
        perPage: 30,
        sort: "updated",
        direction: "desc",
      }),
    enabled: !!state.user,
    staleTime: 30_000, // 30 秒
  });
}

/** 完了済み一覧 (infinite query) */
function useClosedTodos() {
  const { state } = useAuth();
  return useInfiniteQuery({
    queryKey: ["todos", "closed"],
    queryFn: ({ pageParam }) =>
      fetchTodos(state.user!.login, {
        state: "closed",
        perPage: 30,
        page: pageParam,
      }),
    enabled: !!state.user,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasNextPage ? lastPage.nextPage : undefined),
    staleTime: 60_000,
  });
}

/** 単一 TODO */
function useTodo(id: number) {
  const { state } = useAuth();
  return useQuery({
    queryKey: ["todos", id],
    queryFn: () => fetchTodo(state.user!.login, id),
    enabled: !!state.user,
  });
}

/** TODO 作成 (楽観的更新) */
function useCreateTodo() {
  const queryClient = useQueryClient();
  const { state } = useAuth();
  return useMutation({
    mutationFn: (input: CreateTodoInput) => createTodo(state.user!.login, input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ["todos", "open"] });
      const previous = queryClient.getQueryData(["todos", "open"]);

      // 楽観的にリストに追加
      queryClient.setQueryData(["todos", "open"], (old: { todos: Todo[] } | undefined) => ({
        ...old,
        todos: [
          {
            id: -Date.now(), // 一時 ID
            title: input.title,
            body: input.body ?? "",
            state: "open" as const,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            closedAt: null,
            url: "",
          },
          ...(old?.todos ?? []),
        ],
      }));

      return { previous };
    },
    onError: (_err, _input, context) => {
      queryClient.setQueryData(["todos", "open"], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["todos", "open"] });
    },
  });
}

/** TODO 完了 (楽観的更新) */
function useCloseTodo() {
  const queryClient = useQueryClient();
  const { state } = useAuth();
  return useMutation({
    mutationFn: (id: number) => closeTodo(state.user!.login, id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["todos", "open"] });
      const previous = queryClient.getQueryData(["todos", "open"]);

      // 楽観的にリストから除外
      queryClient.setQueryData(["todos", "open"], (old: { todos: Todo[] } | undefined) => ({
        ...old,
        todos: (old?.todos ?? []).filter((t) => t.id !== id),
      }));

      return { previous };
    },
    onError: (_err, _id, context) => {
      queryClient.setQueryData(["todos", "open"], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
  });
}

/** TODO 再オープン (楽観的更新) */
function useReopenTodo() {
  // useCloseTodo と同様のパターン (closed リストから除外 -> open を invalidate)
}

/** TODO 更新 */
function useUpdateTodo() {
  const queryClient = useQueryClient();
  const { state } = useAuth();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & UpdateTodoInput) => updateTodo(state.user!.login, id, data),
    onSuccess: (updatedTodo) => {
      queryClient.setQueryData(["todos", updatedTodo.id], updatedTodo);
      queryClient.invalidateQueries({ queryKey: ["todos", "open"] });
    },
  });
}
```

### 4.3 キャッシュ戦略

| クエリ       | staleTime          | 更新トリガー                          |
| ------------ | ------------------ | ------------------------------------- |
| 未完了一覧   | 30 秒              | 作成・完了・再オープン時に invalidate |
| 完了済み一覧 | 60 秒              | 完了・再オープン時に invalidate       |
| 単一 TODO    | 0 (常にフレッシュ) | 更新時に setQueryData                 |
| ユーザー情報 | 5 分               | ログイン時のみ                        |

---

## 5. UX 詳細

### 5.1 キーボード操作

| 操作               | 動作                                          |
| ------------------ | --------------------------------------------- |
| メイン画面: Enter  | 入力欄の TODO を追加                          |
| メイン画面: Tab    | 入力欄 -> 追加ボタン -> TODO リスト           |
| TODO リスト: Enter | 選択中の TODO の詳細画面へ                    |
| 詳細画面: Escape   | 前の画面に戻る (未保存の変更がある場合は確認) |

### 5.2 ローディング

- **初回表示:** スケルトン UI (3-5 行のプレースホルダー)
- **TODO 追加:** 楽観的更新で即座にリストに追加。失敗時はロールバック
- **完了トグル:** 楽観的更新で即座にリストから除外。CSS fade-out アニメーション
- **詳細保存:** ボタンが "Saving..." に変化。成功でフィードバック

### 5.3 スケルトン UI

```typescript
function ListSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border bg-white px-4 py-3">
          <div className="h-5 w-5 rounded-full bg-gray-200" />
          <div className="h-4 flex-1 rounded bg-gray-200" style={{ width: `${60 + i * 5}%` }} />
        </div>
      ))}
    </div>
  );
}
```

### 5.4 エラー表示

- **ネットワークエラー:** 画面上部にバナー表示 + 「再試行」ボタン
- **バリデーションエラー:** 入力フィールドの下にインラインメッセージ
- **401 (トークン無効):** ログイン画面へリダイレクト
- **429 (レート制限):** 「しばらく待ってから再試行してください」メッセージ

### 5.5 レスポンシブデザイン

モバイルファースト。`max-w-2xl` で PC でもコンパクトに収める。

| ブレークポイント   | レイアウト                                        |
| ------------------ | ------------------------------------------------- |
| < 640px (mobile)   | 全幅、タッチフレンドリーなボタンサイズ (min-h-12) |
| >= 640px (desktop) | max-w-2xl 中央寄せ、ホバー効果追加                |

### 5.6 アニメーション

CSS のみ。Framer Motion は不使用 (バンドルサイズ優先)。

```css
/* TODO 追加時 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-fadeIn {
  animation: fadeIn 0.2s ease-out;
}

/* TODO 完了時 */
@keyframes fadeOut {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(16px);
  }
}
.animate-fadeOut {
  animation: fadeOut 0.3s ease-in forwards;
}
```

### 5.7 完了済みリンク

メイン画面の最下部に控えめに配置。

```typescript
function CompletedLink() {
  return (
    <div className="mt-8 text-center">
      <Link to="/completed" className="text-sm text-gray-400 hover:text-gray-600">
        View completed todos
      </Link>
    </div>
  );
}
```

---

## 6. アクセシビリティ

### フォーカス管理

- 追加後、入力欄にフォーカスを維持 (autoFocus + ref.focus)
- 詳細画面から戻った際、元の TODO にフォーカス復帰

### ARIA 属性

```html
<!-- 完了チェックボックス -->
<button aria-label="Mark as complete" role="checkbox" aria-checked="false">
  <!-- TODO リストアイテム -->
  <div role="button" tabindex="0" aria-label="View details for: Buy groceries">
    <!-- ローディング状態 -->
    <div role="status" aria-label="Loading todos">
      <ListSkeleton />
    </div>
  </div>
</button>
```

### キーボードナビゲーション

- Tab でフォーカス移動
- Enter/Space でアクション実行
- Escape で詳細画面から戻る

---

## 7. SPA ファイル構成

```text
apps/spa/
  public/
    404.html                       # GitHub Pages SPA fallback
    favicon.svg
  src/
    main.tsx                       # エントリポイント
    globals.css                    # TailwindCSS import
    types/
      todo.ts                      # Todo, CreateTodoInput, UpdateTodoInput
      github.ts                    # GitHubIssue, GitHubUser, GitHubRepository
      auth.ts                      # AuthUser
      errors.ts                    # AuthError, GitHubApiError, etc.
    app/
      App.tsx                      # ルートコンポーネント
      router.tsx                   # React Router 設定
      providers.tsx                # QueryClient, AuthProvider 組み立て
    features/
      auth/
        components/
          LoginButton.tsx
          AuthGuard.tsx
        hooks/
          use-auth.ts              # AuthContext + useAuth hook
        lib/
          auth-client.ts           # popup + postMessage ロジック
          token-store.ts           # localStorage CRUD
        __tests__/
          use-auth.test.ts
          token-store.test.ts
      todos/
        components/
          TodoList.tsx
          TodoItem.tsx
          TodoAddForm.tsx
          TodoEmptyState.tsx
          CompletedLink.tsx
          CompletionToggle.tsx
          ListSkeleton.tsx
          DetailSkeleton.tsx
        hooks/
          use-todos.ts             # TanStack Query hooks
        lib/
          github-api.ts            # GitHub Issues API クライアント関数
          issue-mapper.ts          # GitHubIssue -> Todo 変換
          pagination.ts            # Link ヘッダー解析
          repo-init.ts             # リポジトリ自動作成
        __tests__/
          github-api.test.ts
          issue-mapper.test.ts
          pagination.test.ts
          repo-init.test.ts
    shared/
      components/
        layout/
          Header.tsx
          Layout.tsx
        ui/
          ErrorBanner.tsx
          NotFound.tsx
      lib/
        github-client.ts           # GitHub API fetch ラッパー
      __tests__/
        setup.ts                   # Vitest setup (jsdom, msw)
        github-client.test.ts
  index.html
  vite.config.ts
  vitest.config.ts
  eslint.config.mjs
  tsconfig.json
  package.json
```
