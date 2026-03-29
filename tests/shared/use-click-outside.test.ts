import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useClickOutside } from "@/shared/hooks/use-click-outside";
import { createRef } from "react";

describe("useClickOutside", () => {
  it("calls handler when clicking outside the referenced element", () => {
    const handler = vi.fn();
    const ref = createRef<HTMLDivElement>();

    const element = document.createElement("div");
    document.body.appendChild(element);
    Object.defineProperty(ref, "current", { value: element, writable: true });

    renderHook(() => {
      useClickOutside(ref, handler);
    });

    const outsideElement = document.createElement("div");
    document.body.appendChild(outsideElement);

    outsideElement.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));

    expect(handler).toHaveBeenCalledOnce();

    document.body.removeChild(element);
    document.body.removeChild(outsideElement);
  });

  it("does not call handler when clicking inside the referenced element", () => {
    const handler = vi.fn();
    const ref = createRef<HTMLDivElement>();

    const element = document.createElement("div");
    const child = document.createElement("span");
    element.appendChild(child);
    document.body.appendChild(element);
    Object.defineProperty(ref, "current", { value: element, writable: true });

    renderHook(() => {
      useClickOutside(ref, handler);
    });

    child.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));

    expect(handler).not.toHaveBeenCalled();

    document.body.removeChild(element);
  });

  it("does not call handler when ref is null", () => {
    const handler = vi.fn();
    const ref = createRef<HTMLDivElement>();

    renderHook(() => {
      useClickOutside(ref, handler);
    });

    document.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));

    expect(handler).not.toHaveBeenCalled();
  });

  it("removes event listeners on unmount", () => {
    const handler = vi.fn();
    const ref = createRef<HTMLDivElement>();

    const element = document.createElement("div");
    document.body.appendChild(element);
    Object.defineProperty(ref, "current", { value: element, writable: true });

    const { unmount } = renderHook(() => {
      useClickOutside(ref, handler);
    });
    unmount();

    const outsideElement = document.createElement("div");
    document.body.appendChild(outsideElement);
    outsideElement.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));

    expect(handler).not.toHaveBeenCalled();

    document.body.removeChild(element);
    document.body.removeChild(outsideElement);
  });
});
