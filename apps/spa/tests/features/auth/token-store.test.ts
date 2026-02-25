import { describe, it, expect, beforeEach } from "vitest";
import { getToken, setToken, setTokenSet, getRefreshToken, clearToken, isAuthenticated } from "@/features/auth/lib/token-store";

describe("token-store", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("getToken", () => {
    it("returns null when no token is stored", () => {
      expect(getToken()).toBeNull();
    });

    it("returns the stored token", () => {
      localStorage.setItem("ato:token", "test-token");
      expect(getToken()).toBe("test-token");
    });
  });

  describe("setToken", () => {
    it("stores token in localStorage", () => {
      setToken("new-token");
      expect(localStorage.getItem("ato:token")).toBe("new-token");
    });
  });

  describe("setTokenSet", () => {
    it("stores all token fields when provided", () => {
      setTokenSet({
        accessToken: "access-123",
        refreshToken: "refresh-456",
        expiresAt: 1700000000000,
        refreshExpiresAt: 1710000000000,
      });
      expect(localStorage.getItem("ato:token")).toBe("access-123");
      expect(localStorage.getItem("ato:refresh-token")).toBe("refresh-456");
      expect(localStorage.getItem("ato:token-expires-at")).toBe("1700000000000");
      expect(localStorage.getItem("ato:refresh-expires-at")).toBe("1710000000000");
    });

    it("stores only access token when optional fields are undefined", () => {
      setTokenSet({
        accessToken: "access-only",
        refreshToken: undefined,
        expiresAt: undefined,
        refreshExpiresAt: undefined,
      });
      expect(localStorage.getItem("ato:token")).toBe("access-only");
      expect(localStorage.getItem("ato:refresh-token")).toBeNull();
      expect(localStorage.getItem("ato:token-expires-at")).toBeNull();
      expect(localStorage.getItem("ato:refresh-expires-at")).toBeNull();
    });
  });

  describe("getRefreshToken", () => {
    it("returns null when no refresh token is stored", () => {
      expect(getRefreshToken()).toBeNull();
    });

    it("returns the stored refresh token", () => {
      localStorage.setItem("ato:refresh-token", "refresh-abc");
      expect(getRefreshToken()).toBe("refresh-abc");
    });
  });

  describe("clearToken", () => {
    it("removes token from localStorage", () => {
      localStorage.setItem("ato:token", "test-token");
      clearToken();
      expect(localStorage.getItem("ato:token")).toBeNull();
    });

    it("removes refresh token from localStorage", () => {
      localStorage.setItem("ato:token", "test-token");
      localStorage.setItem("ato:refresh-token", "refresh-token");
      clearToken();
      expect(localStorage.getItem("ato:refresh-token")).toBeNull();
    });

    it("removes expiry timestamps from localStorage", () => {
      localStorage.setItem("ato:token", "test-token");
      localStorage.setItem("ato:token-expires-at", "1700000000000");
      localStorage.setItem("ato:refresh-expires-at", "1710000000000");
      clearToken();
      expect(localStorage.getItem("ato:token-expires-at")).toBeNull();
      expect(localStorage.getItem("ato:refresh-expires-at")).toBeNull();
    });

    it("removes user cache from localStorage", () => {
      localStorage.setItem("ato:token", "test-token");
      localStorage.setItem("ato:user", '{"login":"user"}');
      clearToken();
      expect(localStorage.getItem("ato:user")).toBeNull();
    });

    it("removes repo-initialized flag from localStorage", () => {
      localStorage.setItem("ato:token", "test-token");
      localStorage.setItem("ato:repo-initialized", "true");
      clearToken();
      expect(localStorage.getItem("ato:repo-initialized")).toBeNull();
    });
  });

  describe("isAuthenticated", () => {
    it("returns false when no token exists", () => {
      expect(isAuthenticated()).toBe(false);
    });

    it("returns true when token exists", () => {
      localStorage.setItem("ato:token", "test-token");
      expect(isAuthenticated()).toBe(true);
    });
  });
});
