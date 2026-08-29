import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useSpeechRecognition } from "@/features/actions/hooks/use-speech-recognition";
import type {
  SpeechRecognitionErrorEventLike,
  SpeechRecognitionLike,
  SpeechRecognitionResultEventLike,
  SpeechRecognitionResultLike,
} from "@/features/actions/lib/speech-recognition";

class FakeRecognition implements SpeechRecognitionLike {
  lang = "";
  continuous = true;
  interimResults = false;
  maxAlternatives = 0;
  onstart: ((event: Event) => void) | null = null;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null = null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null = null;
  onnomatch: ((event: Event) => void) | null = null;
  onend: ((event: Event) => void) | null = null;
  readonly start = vi.fn(() => this.onstart?.(new Event("start")));
  readonly stop = vi.fn();
  readonly abort = vi.fn();

  result(transcript: string, isFinal: boolean): void {
    const result: SpeechRecognitionResultLike = {
      isFinal,
      item: () => ({ transcript }),
    };
    this.onresult?.({
      resultIndex: 0,
      results: { length: 1, item: () => result },
    } as unknown as SpeechRecognitionResultEventLike);
  }

  error(error: string): void {
    this.onerror?.({ error } as SpeechRecognitionErrorEventLike);
  }

  noMatch(): void {
    this.onnomatch?.(new Event("nomatch"));
  }

  end(): void {
    this.onend?.(new Event("end"));
  }
}

describe("useSpeechRecognition", () => {
  it("configures ja-JP and commits only the final result after recognition ends", () => {
    const recognition = new FakeRecognition();
    const onFinal = vi.fn();
    const { result } = renderHook(() => useSpeechRecognition({ onFinal, createRecognition: () => recognition }));

    act(() => {
      result.current.start();
    });
    expect(recognition.lang).toBe("ja-JP");
    expect(recognition.continuous).toBe(false);
    expect(recognition.interimResults).toBe(true);
    expect(result.current.state).toBe("listening");

    act(() => {
      recognition.result("途中", false);
    });
    expect(result.current.interimTranscript).toBe("途中");
    expect(onFinal).not.toHaveBeenCalled();

    act(() => {
      recognition.result("確定", true);
    });
    expect(result.current.state).toBe("finalizing");
    expect(onFinal).not.toHaveBeenCalled();

    act(() => {
      recognition.end();
    });
    expect(onFinal).toHaveBeenCalledWith("確定");
    expect(result.current.state).toBe("idle");
  });

  it("preserves an error state and allows a later retry", () => {
    const first = new FakeRecognition();
    const second = new FakeRecognition();
    const createRecognition = vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(second);
    const { result } = renderHook(() => useSpeechRecognition({ onFinal: vi.fn(), createRecognition }));

    act(() => {
      result.current.start();
    });
    act(() => {
      first.error("not-allowed");
    });
    act(() => {
      first.end();
    });
    expect(result.current.state).toBe("error");
    expect(result.current.errorMessage).toContain("許可");

    act(() => {
      result.current.start();
    });
    expect(createRecognition).toHaveBeenCalledTimes(2);
    expect(result.current.state).toBe("listening");
  });

  it.each([
    ["network", "通信状態"],
    ["audio-capture", "マイク"],
  ])("keeps keyboard input available after a %s error", (error, expectedMessage) => {
    const recognition = new FakeRecognition();
    const { result } = renderHook(() => useSpeechRecognition({ onFinal: vi.fn(), createRecognition: () => recognition }));

    act(() => {
      result.current.start();
      recognition.error(error);
    });

    expect(result.current.state).toBe("error");
    expect(result.current.errorMessage).toContain(expectedMessage);
  });

  it("reports no-match without committing a transcript", () => {
    const recognition = new FakeRecognition();
    const onFinal = vi.fn();
    const { result } = renderHook(() => useSpeechRecognition({ onFinal, createRecognition: () => recognition }));

    act(() => {
      result.current.start();
      recognition.noMatch();
    });

    expect(result.current.state).toBe("error");
    expect(result.current.errorMessage).toContain("認識できません");
    expect(onFinal).not.toHaveBeenCalled();
  });

  it("does not start twice and aborts on cancel", () => {
    const recognition = new FakeRecognition();
    const { result } = renderHook(() => useSpeechRecognition({ onFinal: vi.fn(), createRecognition: () => recognition }));

    act(() => {
      result.current.start();
      result.current.start();
    });
    expect(recognition.start).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.cancel();
    });
    expect(recognition.abort).toHaveBeenCalledTimes(1);
    expect(result.current.state).toBe("idle");
  });

  it("aborts and releases the recognition session on unmount", () => {
    const recognition = new FakeRecognition();
    const { result, unmount } = renderHook(() => useSpeechRecognition({ onFinal: vi.fn(), createRecognition: () => recognition }));
    act(() => {
      result.current.start();
    });

    unmount();
    expect(recognition.abort).toHaveBeenCalledTimes(1);
    expect(recognition.onresult).toBeNull();
  });
});
