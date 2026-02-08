import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { initViewportHeight } from "@/shared/lib/viewport-height";

describe("initViewportHeight", () => {
  let setPropertySpy: ReturnType<typeof vi.fn>;
  const originalInnerHeight = window.innerHeight;

  beforeEach(() => {
    setPropertySpy = vi.fn();
    vi.spyOn(document.documentElement.style, "setProperty").mockImplementation(setPropertySpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, "innerHeight", { value: originalInnerHeight, writable: true });
  });

  it("sets --app-height to window.innerHeight on init", () => {
    Object.defineProperty(window, "innerHeight", { value: 760, writable: true });

    initViewportHeight();

    expect(setPropertySpy).toHaveBeenCalledWith("--app-height", "760px");
  });

  it("updates --app-height on window resize", () => {
    Object.defineProperty(window, "innerHeight", { value: 760, writable: true });
    initViewportHeight();
    setPropertySpy.mockClear();

    Object.defineProperty(window, "innerHeight", { value: 600, writable: true });
    window.dispatchEvent(new Event("resize"));

    expect(setPropertySpy).toHaveBeenCalledWith("--app-height", "600px");
  });
});
