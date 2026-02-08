import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { openLoginPopup, LOGIN_TIMEOUT_MS } from "@/features/auth/lib/auth-client";

describe("openLoginPopup", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function createMockPopup(overrides?: Partial<{ closed: boolean }>) {
    return { close: vi.fn(), closed: overrides?.closed ?? false };
  }

  it("opens a popup window with the correct URL", async () => {
    const mockPopup = createMockPopup();
    vi.spyOn(window, "open").mockReturnValue(mockPopup as unknown as Window);

    const promise = openLoginPopup("https://proxy.example.com");

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "https://proxy.example.com",
        data: { type: "ato:auth:success", accessToken: "token-123" },
      }),
    );

    await promise;

    expect(window.open).toHaveBeenCalledWith("https://proxy.example.com/auth/login", "ato-login", "width=600,height=700");
  });

  it("resolves with accessToken on success message", async () => {
    const mockPopup = createMockPopup();
    vi.spyOn(window, "open").mockReturnValue(mockPopup as unknown as Window);

    const promise = openLoginPopup("https://proxy.example.com");

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "https://proxy.example.com",
        data: { type: "ato:auth:success", accessToken: "my-token" },
      }),
    );

    const token = await promise;
    expect(token).toBe("my-token");
    expect(mockPopup.close).toHaveBeenCalled();
  });

  it("rejects on error message", async () => {
    const mockPopup = createMockPopup();
    vi.spyOn(window, "open").mockReturnValue(mockPopup as unknown as Window);

    const promise = openLoginPopup("https://proxy.example.com");

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "https://proxy.example.com",
        data: { type: "ato:auth:error", error: "invalid_state" },
      }),
    );

    await expect(promise).rejects.toThrow("invalid_state");
    expect(mockPopup.close).toHaveBeenCalled();
  });

  it("ignores messages from wrong origin", async () => {
    const mockPopup = createMockPopup();
    vi.spyOn(window, "open").mockReturnValue(mockPopup as unknown as Window);

    const promise = openLoginPopup("https://proxy.example.com");

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "https://evil.example.com",
        data: { type: "ato:auth:success", accessToken: "stolen" },
      }),
    );

    // Send correct message after to resolve the promise
    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "https://proxy.example.com",
        data: { type: "ato:auth:success", accessToken: "real-token" },
      }),
    );

    const token = await promise;
    expect(token).toBe("real-token");
  });

  it("rejects when popup fails to open", async () => {
    vi.spyOn(window, "open").mockReturnValue(null);

    await expect(openLoginPopup("https://proxy.example.com")).rejects.toThrow("Popup blocked");
  });

  it("rejects when popup is closed before authentication", async () => {
    const mockPopup = createMockPopup();
    vi.spyOn(window, "open").mockReturnValue(mockPopup as unknown as Window);

    const promise = openLoginPopup("https://proxy.example.com");

    mockPopup.closed = true;
    vi.advanceTimersByTime(500);

    await expect(promise).rejects.toThrow("Login popup was closed before authentication completed.");
  });

  it("rejects on timeout when no message is received", async () => {
    const mockPopup = createMockPopup();
    vi.spyOn(window, "open").mockReturnValue(mockPopup as unknown as Window);

    const promise = openLoginPopup("https://proxy.example.com");

    vi.advanceTimersByTime(LOGIN_TIMEOUT_MS);

    await expect(promise).rejects.toThrow("Login timed out. Please try again.");
    expect(mockPopup.close).toHaveBeenCalled();
  });

  it("cleans up event listener on success", async () => {
    const mockPopup = createMockPopup();
    vi.spyOn(window, "open").mockReturnValue(mockPopup as unknown as Window);
    const removeListenerSpy = vi.spyOn(window, "removeEventListener");

    const promise = openLoginPopup("https://proxy.example.com");

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "https://proxy.example.com",
        data: { type: "ato:auth:success", accessToken: "token" },
      }),
    );

    await promise;

    expect(removeListenerSpy).toHaveBeenCalledWith("message", expect.any(Function));
  });

  it("cleans up event listener on popup close", async () => {
    const mockPopup = createMockPopup();
    vi.spyOn(window, "open").mockReturnValue(mockPopup as unknown as Window);
    const removeListenerSpy = vi.spyOn(window, "removeEventListener");

    const promise = openLoginPopup("https://proxy.example.com");

    mockPopup.closed = true;
    vi.advanceTimersByTime(500);

    await expect(promise).rejects.toThrow();

    expect(removeListenerSpy).toHaveBeenCalledWith("message", expect.any(Function));
  });

  it("normalizes origin with trailing slash for comparison", async () => {
    const mockPopup = createMockPopup();
    vi.spyOn(window, "open").mockReturnValue(mockPopup as unknown as Window);

    const promise = openLoginPopup("https://proxy.example.com/");

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "https://proxy.example.com",
        data: { type: "ato:auth:success", accessToken: "token-normalized" },
      }),
    );

    const token = await promise;
    expect(token).toBe("token-normalized");
  });

  it("does not resolve after timeout even if message arrives later", async () => {
    const mockPopup = createMockPopup();
    vi.spyOn(window, "open").mockReturnValue(mockPopup as unknown as Window);

    const promise = openLoginPopup("https://proxy.example.com");

    vi.advanceTimersByTime(LOGIN_TIMEOUT_MS);

    await expect(promise).rejects.toThrow("Login timed out");

    // Late message arrives -- should be ignored
    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "https://proxy.example.com",
        data: { type: "ato:auth:success", accessToken: "late-token" },
      }),
    );
  });
});
