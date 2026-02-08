export interface AuthUser {
  readonly login: string;
  readonly id: number;
  readonly avatarUrl: string;
}

export interface AuthState {
  readonly token: string | null;
  readonly user: AuthUser | null;
  readonly isLoading: boolean;
}

export interface AuthContextValue {
  readonly state: AuthState;
  readonly login: () => void;
  readonly logout: () => void;
}

export interface OAuthSuccessMessage {
  readonly type: "ato:auth:success";
  readonly accessToken: string;
}

export interface OAuthErrorMessage {
  readonly type: "ato:auth:error";
  readonly error: string;
}

export type OAuthMessage = OAuthSuccessMessage | OAuthErrorMessage;

export interface GitHubUser {
  readonly login: string;
  readonly id: number;
  readonly avatar_url: string;
}
