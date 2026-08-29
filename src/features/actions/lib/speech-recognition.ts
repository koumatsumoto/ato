const TITLE_MAX_LENGTH = 256;

export interface SpeechRecognitionAlternativeLike {
  readonly transcript: string;
}

export interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  item(index: number): SpeechRecognitionAlternativeLike;
}

export interface SpeechRecognitionResultListLike {
  readonly length: number;
  item(index: number): SpeechRecognitionResultLike;
}

export interface SpeechRecognitionResultEventLike extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultListLike;
}

export interface SpeechRecognitionErrorEventLike extends Event {
  readonly error: string;
}

export interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: ((event: Event) => void) | null;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onnomatch: ((event: Event) => void) | null;
  onend: ((event: Event) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechRecognitionWindow = Window &
  typeof globalThis & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

export function createBrowserSpeechRecognition(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;

  const speechWindow = window as SpeechRecognitionWindow;
  const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
  return Recognition ? new Recognition() : null;
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  const speechWindow = window as SpeechRecognitionWindow;
  return Boolean(speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition);
}

function truncateTitle(value: string): string {
  const truncated = value.slice(0, TITLE_MAX_LENGTH);
  const lastCodeUnit = truncated.charCodeAt(truncated.length - 1);
  return lastCodeUnit >= 0xd800 && lastCodeUnit <= 0xdbff ? truncated.slice(0, -1) : truncated;
}

export function normalizeSpeechText(value: string): string {
  const normalized = value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/gu, "")
    .replace(/\s+/gu, " ")
    .replace(/([。、！？!?])\1+/gu, "$1")
    .trim();

  return truncateTitle(normalized);
}

export function appendSpeechToDraft(draft: string, transcript: string): string {
  const normalizedTranscript = normalizeSpeechText(transcript);
  if (!normalizedTranscript) return draft;

  const separator = draft.length > 0 && !/\s$/u.test(draft) ? " " : "";
  return truncateTitle(`${draft}${separator}${normalizedTranscript}`);
}

export function speechRecognitionErrorMessage(error: string): string {
  switch (error) {
    case "not-allowed":
    case "service-not-allowed":
      return "マイクの使用が許可されませんでした。ブラウザの設定を確認してください。";
    case "no-speech":
      return "音声を認識できませんでした。もう一度お試しください。";
    case "audio-capture":
      return "マイクを利用できません。端末のマイク設定を確認してください。";
    case "network":
      return "音声認識を利用できません。通信状態を確認してください。";
    case "language-not-supported":
      return "この環境では日本語の音声認識を利用できません。";
    default:
      return "音声認識を完了できませんでした。キーボード入力はそのまま利用できます。";
  }
}
