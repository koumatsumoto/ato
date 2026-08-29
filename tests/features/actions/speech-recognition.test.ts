import { describe, expect, it } from "vitest";
import { appendSpeechToDraft, normalizeSpeechText, speechRecognitionErrorMessage } from "@/features/actions/lib/speech-recognition";

describe("speech recognition text handling", () => {
  it("normalizes only whitespace, control characters, and duplicate punctuation", () => {
    expect(normalizeSpeechText("  牛乳\n\nを\u0000買う！！  ")).toBe("牛乳 を買う！");
  });

  it("does not remove fillers or interpret self-corrections", () => {
    const transcript = "えー 牛乳、じゃなくて豆乳を買う";
    expect(normalizeSpeechText(transcript)).toBe(transcript);
  });

  it("keeps the existing draft and appends recognized text", () => {
    expect(appendSpeechToDraft("帰りに", "牛乳を買う")).toBe("帰りに 牛乳を買う");
  });

  it("does not exceed the title limit or split a surrogate pair", () => {
    const result = appendSpeechToDraft("a".repeat(255), "😀");
    expect(result.length).toBe(256);
    expect(result.endsWith("\ud83d")).toBe(false);
  });

  it("provides actionable messages for permission and network errors", () => {
    expect(speechRecognitionErrorMessage("not-allowed")).toContain("許可");
    expect(speechRecognitionErrorMessage("network")).toContain("通信状態");
  });
});
