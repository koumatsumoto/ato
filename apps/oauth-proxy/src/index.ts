interface Env {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  SPA_ORIGIN: string;
}

function securityHeaders(): Record<string, string> {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  };
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "3600",
  };
}

function parseCookies(cookie: string): Record<string, string> {
  return Object.fromEntries(
    cookie
      .split(";")
      .map((pair) => pair.trim().split("="))
      .filter(([key]) => key)
      .map(([key, ...rest]) => [key, rest.join("=")]),
  );
}

function clearCookieHeader(): string {
  return "oauth_state=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/";
}

function escapeForJs(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/</g, "\\u003c");
}

function postMessageResponse(origin: string, message: object, extraHeaders?: Record<string, string>): Response {
  const json = JSON.stringify(message).replace(/</g, "\\u003c");
  const safeOrigin = escapeForJs(origin);
  const html = `<!DOCTYPE html>
<html>
<body>
<p>Logging in...</p>
<script>
if(window.opener){window.opener.postMessage(${json},"${safeOrigin}");}
window.close();
</script>
</body>
</html>`;
  return new Response(html, {
    headers: {
      "Content-Type": "text/html",
      "Content-Security-Policy": "default-src 'none'; script-src 'unsafe-inline'",
      ...securityHeaders(),
      ...extraHeaders,
    },
  });
}

function handleLogin(url: URL, env: Env): Response {
  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: `${url.origin}/auth/callback`,
    scope: "repo",
    state,
  });

  return new Response(null, {
    status: 302,
    headers: {
      Location: `https://github.com/login/oauth/authorize?${params}`,
      "Set-Cookie": `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Max-Age=600; Path=/`,
      ...securityHeaders(),
    },
  });
}

async function handleCallback(url: URL, request: Request, env: Env): Promise<Response> {
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const clearCookie = { "Set-Cookie": clearCookieHeader() };

  if (!code || !state) {
    return postMessageResponse(env.SPA_ORIGIN, { type: "ato:auth:error", error: "missing_params" }, clearCookie);
  }

  const cookies = parseCookies(request.headers.get("Cookie") ?? "");
  if (cookies["oauth_state"] !== state) {
    return postMessageResponse(env.SPA_ORIGIN, { type: "ato:auth:error", error: "invalid_state" }, clearCookie);
  }

  try {
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData: { access_token?: string } = await tokenRes.json();
    if (!tokenData.access_token) {
      return postMessageResponse(env.SPA_ORIGIN, { type: "ato:auth:error", error: "token_exchange_failed" }, clearCookie);
    }

    return postMessageResponse(env.SPA_ORIGIN, { type: "ato:auth:success", accessToken: tokenData.access_token }, clearCookie);
  } catch {
    return postMessageResponse(env.SPA_ORIGIN, { type: "ato:auth:error", error: "token_exchange_failed" }, clearCookie);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: { ...corsHeaders(env.SPA_ORIGIN), ...securityHeaders() },
      });
    }

    if (url.pathname === "/auth/login" && request.method === "GET") {
      return handleLogin(url, env);
    }

    if (url.pathname === "/auth/callback" && request.method === "GET") {
      return handleCallback(url, request, env);
    }

    if (url.pathname === "/auth/health") {
      return new Response("OK", { status: 200, headers: securityHeaders() });
    }

    return new Response("Not Found", { status: 404, headers: securityHeaders() });
  },
} satisfies ExportedHandler<Env>;
