import { describe, it, expect, vi, afterEach } from "vitest";
import { openLoginPopup } from "@/features/auth/lib/auth-client";

describe("openLoginPopup", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("opens a popup window with the correct URL", async () => {
    const mockPopup = { close: vi.fn(), closed: false };
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
    const mockPopup = { close: vi.fn(), closed: false };
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
    const mockPopup = { close: vi.fn(), closed: false };
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
    const mockPopup = { close: vi.fn(), closed: false };
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
});
