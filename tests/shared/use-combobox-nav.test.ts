import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useComboboxNav } from "@/shared/hooks/use-combobox-nav";

function createKeyboardEvent(key: string): React.KeyboardEvent {
  return { key, preventDefault: vi.fn() } as unknown as React.KeyboardEvent;
}

describe("useComboboxNav", () => {
  const defaultParams = {
    itemCount: 3,
    inputIsEmpty: true,
    onSelect: vi.fn(),
    onInputSubmit: vi.fn(),
    onBackspace: vi.fn(),
  };

  it("starts closed with no highlight", () => {
    const { result } = renderHook(() => useComboboxNav(defaultParams));

    expect(result.current.isOpen).toBe(false);
    expect(result.current.highlightedIndex).toBe(-1);
  });

  it("opens on ArrowDown and highlights first item", () => {
    const { result } = renderHook(() => useComboboxNav(defaultParams));

    act(() => {
      result.current.handleKeyDown(createKeyboardEvent("ArrowDown"));
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.highlightedIndex).toBe(0);
  });

  it("cycles highlight with ArrowDown", () => {
    const { result } = renderHook(() => useComboboxNav(defaultParams));

    act(() => {
      result.current.handleKeyDown(createKeyboardEvent("ArrowDown"));
    });
    act(() => {
      result.current.handleKeyDown(createKeyboardEvent("ArrowDown"));
    });
    act(() => {
      result.current.handleKeyDown(createKeyboardEvent("ArrowDown"));
    });

    expect(result.current.highlightedIndex).toBe(2);

    // Wraps around
    act(() => {
      result.current.handleKeyDown(createKeyboardEvent("ArrowDown"));
    });

    expect(result.current.highlightedIndex).toBe(0);
  });

  it("cycles highlight with ArrowUp", () => {
    const { result } = renderHook(() => useComboboxNav(defaultParams));

    // ArrowUp from -1 wraps to last item
    act(() => {
      result.current.handleKeyDown(createKeyboardEvent("ArrowUp"));
    });

    expect(result.current.highlightedIndex).toBe(2);

    act(() => {
      result.current.handleKeyDown(createKeyboardEvent("ArrowUp"));
    });

    expect(result.current.highlightedIndex).toBe(1);
  });

  it("calls onSelect on Enter when item is highlighted", () => {
    const onSelect = vi.fn();
    const { result } = renderHook(() => useComboboxNav({ ...defaultParams, onSelect }));

    act(() => {
      result.current.handleKeyDown(createKeyboardEvent("ArrowDown"));
    });

    act(() => {
      result.current.handleKeyDown(createKeyboardEvent("Enter"));
    });

    expect(onSelect).toHaveBeenCalledWith(0);
    expect(result.current.highlightedIndex).toBe(-1);
  });

  it("calls onInputSubmit on Enter when no item is highlighted", () => {
    const onInputSubmit = vi.fn();
    const { result } = renderHook(() => useComboboxNav({ ...defaultParams, onInputSubmit }));

    act(() => {
      result.current.handleKeyDown(createKeyboardEvent("Enter"));
    });

    expect(onInputSubmit).toHaveBeenCalledOnce();
  });

  it("closes on Escape and resets highlight", () => {
    const { result } = renderHook(() => useComboboxNav(defaultParams));

    act(() => {
      result.current.open();
    });
    act(() => {
      result.current.handleKeyDown(createKeyboardEvent("ArrowDown"));
    });
    act(() => {
      result.current.handleKeyDown(createKeyboardEvent("Escape"));
    });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.highlightedIndex).toBe(-1);
  });

  it("calls onBackspace when input is empty", () => {
    const onBackspace = vi.fn();
    const { result } = renderHook(() => useComboboxNav({ ...defaultParams, inputIsEmpty: true, onBackspace }));

    act(() => {
      result.current.handleKeyDown(createKeyboardEvent("Backspace"));
    });

    expect(onBackspace).toHaveBeenCalledOnce();
  });

  it("does not call onBackspace when input is not empty", () => {
    const onBackspace = vi.fn();
    const { result } = renderHook(() => useComboboxNav({ ...defaultParams, inputIsEmpty: false, onBackspace }));

    act(() => {
      result.current.handleKeyDown(createKeyboardEvent("Backspace"));
    });

    expect(onBackspace).not.toHaveBeenCalled();
  });

  it("onInputChange opens and resets highlight", () => {
    const { result } = renderHook(() => useComboboxNav(defaultParams));

    act(() => {
      result.current.handleKeyDown(createKeyboardEvent("ArrowDown"));
    });

    expect(result.current.highlightedIndex).toBe(0);

    act(() => {
      result.current.onInputChange();
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.highlightedIndex).toBe(-1);
  });

  it("close resets both isOpen and highlightedIndex", () => {
    const { result } = renderHook(() => useComboboxNav(defaultParams));

    act(() => {
      result.current.open();
    });
    act(() => {
      result.current.handleKeyDown(createKeyboardEvent("ArrowDown"));
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.highlightedIndex).toBe(0);

    act(() => {
      result.current.close();
    });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.highlightedIndex).toBe(-1);
  });
});
