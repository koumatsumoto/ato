import { describe, it, expect, beforeEach } from "vitest";
import { getToken, setToken, clearToken, isAuthenticated } from "@/features/auth/lib/token-store";

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

  describe("clearToken", () => {
    it("removes token from localStorage", () => {
      localStorage.setItem("ato:token", "test-token");
      clearToken();
      expect(localStorage.getItem("ato:token")).toBeNull();
    });

    it("removes user cache from localStorage", () => {
      localStorage.setItem("ato:user", '{"login":"user"}');
      clearToken();
      expect(localStorage.getItem("ato:user")).toBeNull();
    });

    it("removes repo-initialized flag from localStorage", () => {
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
