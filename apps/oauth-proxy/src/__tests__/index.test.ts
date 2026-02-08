import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import worker from "../index";

const TEST_ENV = {
  GITHUB_CLIENT_ID: "test-client-id",
  GITHUB_CLIENT_SECRET: "test-client-secret",
  SPA_ORIGIN: "http://localhost:5173",
};

const FIXED_STATE = "fixed-uuid-state";

function createRequest(path: string, options?: RequestInit): Request {
  return new Request(`http://localhost:8787${path}`, options);
}

function createCallbackRequest(params: { code?: string; state?: string }, cookieState?: string): Request {
  const searchParams = new URLSearchParams();
  if (params.code) searchParams.set("code", params.code);
  if (params.state) searchParams.set("state", params.state);

  const headers: HeadersInit = {};
  if (cookieState) {
    headers["Cookie"] = `oauth_state=${cookieState}`;
  }

  return new Request(`http://localhost:8787/auth/callback?${searchParams}`, { headers });
}

function expectSecurityHeaders(response: Response): void {
  expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
  expect(response.headers.get("X-Frame-Options")).toBe("DENY");
  expect(response.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
}

describe("OAuth Proxy Worker", () => {
  beforeEach(() => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue(FIXED_STATE as ReturnType<typeof crypto.randomUUID>);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /auth/health", () => {
    it("returns 200 OK", async () => {
      const response = await worker.fetch(createRequest("/auth/health"), TEST_ENV);

      expect(response.status).toBe(200);
      expect(await response.text()).toBe("OK");
    });

    it("includes security headers", async () => {
      const response = await worker.fetch(createRequest("/auth/health"), TEST_ENV);

      expectSecurityHeaders(response);
    });
  });

  describe("OPTIONS (CORS preflight)", () => {
    it("returns 204 with CORS headers", async () => {
      const response = await worker.fetch(createRequest("/auth/login", { method: "OPTIONS" }), TEST_ENV);

      expect(response.status).toBe(204);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe(TEST_ENV.SPA_ORIGIN);
      expect(response.headers.get("Access-Control-Allow-Methods")).toBe("GET, OPTIONS");
      expect(response.headers.get("Access-Control-Allow-Headers")).toBe("Content-Type");
      expect(response.headers.get("Access-Control-Max-Age")).toBe("3600");
    });

    it("includes security headers", async () => {
      const response = await worker.fetch(createRequest("/auth/login", { method: "OPTIONS" }), TEST_ENV);

      expectSecurityHeaders(response);
    });
  });

  describe("GET /auth/login", () => {
    it("returns 302 redirect to GitHub OAuth", async () => {
      const response = await worker.fetch(createRequest("/auth/login"), TEST_ENV);

      expect(response.status).toBe(302);

      const location = new URL(response.headers.get("Location")!);
      expect(location.origin).toBe("https://github.com");
      expect(location.pathname).toBe("/login/oauth/authorize");
      expect(location.searchParams.get("client_id")).toBe(TEST_ENV.GITHUB_CLIENT_ID);
      expect(location.searchParams.get("redirect_uri")).toBe("http://localhost:8787/auth/callback");
      expect(location.searchParams.has("scope")).toBe(false);
      expect(location.searchParams.get("state")).toBe(FIXED_STATE);
    });

    it("sets HttpOnly cookie with state", async () => {
      const response = await worker.fetch(createRequest("/auth/login"), TEST_ENV);

      const cookie = response.headers.get("Set-Cookie");
      expect(cookie).toContain(`oauth_state=${FIXED_STATE}`);
      expect(cookie).toContain("HttpOnly");
      expect(cookie).toContain("Secure");
      expect(cookie).toContain("SameSite=Lax");
      expect(cookie).toContain("Max-Age=600");
      expect(cookie).toContain("Path=/");
    });

    it("includes security headers", async () => {
      const response = await worker.fetch(createRequest("/auth/login"), TEST_ENV);

      expectSecurityHeaders(response);
    });

    it("rejects non-GET methods", async () => {
      const response = await worker.fetch(createRequest("/auth/login", { method: "POST" }), TEST_ENV);

      expect(response.status).toBe(404);
    });
  });

  describe("GET /auth/callback", () => {
    describe("validation errors", () => {
      it("returns error when code is missing", async () => {
        const response = await worker.fetch(createCallbackRequest({ state: FIXED_STATE }, FIXED_STATE), TEST_ENV);

        expect(response.headers.get("Content-Type")).toBe("text/html");
        const body = await response.text();
        expect(body).toContain('"type":"ato:auth:error"');
        expect(body).toContain('"error":"missing_params"');
        expect(body).toContain(`"${TEST_ENV.SPA_ORIGIN}"`);
        expect(body).toContain("window.close()");
      });

      it("returns error when state is missing", async () => {
        const response = await worker.fetch(createCallbackRequest({ code: "test-code" }, FIXED_STATE), TEST_ENV);

        const body = await response.text();
        expect(body).toContain('"error":"missing_params"');
      });

      it("returns error when state does not match cookie", async () => {
        const response = await worker.fetch(createCallbackRequest({ code: "test-code", state: "wrong-state" }, FIXED_STATE), TEST_ENV);

        const body = await response.text();
        expect(body).toContain('"error":"invalid_state"');
      });

      it("returns error when cookie is missing", async () => {
        const response = await worker.fetch(createCallbackRequest({ code: "test-code", state: FIXED_STATE }), TEST_ENV);

        const body = await response.text();
        expect(body).toContain('"error":"invalid_state"');
      });
    });

    describe("token exchange", () => {
      it("returns success with access token on successful exchange", async () => {
        const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
          new Response(JSON.stringify({ access_token: "gho_test_token_123" }), {
            headers: { "Content-Type": "application/json" },
          }),
        );

        const response = await worker.fetch(createCallbackRequest({ code: "valid-code", state: FIXED_STATE }, FIXED_STATE), TEST_ENV);

        const body = await response.text();
        expect(body).toContain('"type":"ato:auth:success"');
        expect(body).toContain('"accessToken":"gho_test_token_123"');
        expect(body).toContain(`"${TEST_ENV.SPA_ORIGIN}"`);
        expect(body).toContain("window.close()");

        expect(fetchSpy).toHaveBeenCalledWith("https://github.com/login/oauth/access_token", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            client_id: TEST_ENV.GITHUB_CLIENT_ID,
            client_secret: TEST_ENV.GITHUB_CLIENT_SECRET,
            code: "valid-code",
          }),
        });
      });

      it("returns error when GitHub API returns no access_token", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
          new Response(JSON.stringify({ error: "bad_verification_code" }), {
            headers: { "Content-Type": "application/json" },
          }),
        );

        const response = await worker.fetch(createCallbackRequest({ code: "invalid-code", state: FIXED_STATE }, FIXED_STATE), TEST_ENV);

        const body = await response.text();
        expect(body).toContain('"error":"token_exchange_failed"');
      });

      it("returns error when GitHub API fetch throws", async () => {
        vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network error"));

        const response = await worker.fetch(createCallbackRequest({ code: "valid-code", state: FIXED_STATE }, FIXED_STATE), TEST_ENV);

        const body = await response.text();
        expect(body).toContain('"error":"token_exchange_failed"');
      });
    });

    describe("cookie clearing", () => {
      it("clears cookie on successful callback", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
          new Response(JSON.stringify({ access_token: "gho_test" }), {
            headers: { "Content-Type": "application/json" },
          }),
        );

        const response = await worker.fetch(createCallbackRequest({ code: "valid-code", state: FIXED_STATE }, FIXED_STATE), TEST_ENV);

        const cookie = response.headers.get("Set-Cookie");
        expect(cookie).toContain("oauth_state=");
        expect(cookie).toContain("Max-Age=0");
      });

      it("clears cookie on error callback", async () => {
        const response = await worker.fetch(createCallbackRequest({ state: FIXED_STATE }, FIXED_STATE), TEST_ENV);

        const cookie = response.headers.get("Set-Cookie");
        expect(cookie).toContain("oauth_state=");
        expect(cookie).toContain("Max-Age=0");
      });
    });

    it("includes security headers", async () => {
      const response = await worker.fetch(createCallbackRequest({ state: FIXED_STATE }, FIXED_STATE), TEST_ENV);

      expectSecurityHeaders(response);
    });

    it("includes CSP header", async () => {
      const response = await worker.fetch(createCallbackRequest({ state: FIXED_STATE }, FIXED_STATE), TEST_ENV);

      expect(response.headers.get("Content-Security-Policy")).toBe("default-src 'none'; script-src 'unsafe-inline'");
    });

    it("rejects non-GET methods", async () => {
      const response = await worker.fetch(new Request("http://localhost:8787/auth/callback?code=test&state=test", { method: "POST" }), TEST_ENV);

      expect(response.status).toBe(404);
    });

    it("escapes special characters in SPA_ORIGIN for postMessage", async () => {
      const maliciousEnv = {
        ...TEST_ENV,
        SPA_ORIGIN: 'https://evil.com");alert(1)//',
      };

      const response = await worker.fetch(createCallbackRequest({ state: FIXED_STATE }, FIXED_STATE), maliciousEnv);

      const body = await response.text();
      expect(body).toContain('evil.com\\");alert(1)');
      expect(body).not.toMatch(/[^\\]"\);alert/);
    });

    it("escapes script-breaking characters in HTML output", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "token</script><script>alert(1)" }), {
          headers: { "Content-Type": "application/json" },
        }),
      );

      const response = await worker.fetch(createCallbackRequest({ code: "valid-code", state: FIXED_STATE }, FIXED_STATE), TEST_ENV);

      const body = await response.text();
      expect(body).not.toContain("</script><script>");
      expect(body).toContain("\\u003c");
    });
  });

  describe("404 fallback", () => {
    it("returns 404 for unknown paths", async () => {
      const response = await worker.fetch(createRequest("/unknown"), TEST_ENV);

      expect(response.status).toBe(404);
      expect(await response.text()).toBe("Not Found");
    });

    it("includes security headers", async () => {
      const response = await worker.fetch(createRequest("/unknown"), TEST_ENV);

      expectSecurityHeaders(response);
    });
  });
});
