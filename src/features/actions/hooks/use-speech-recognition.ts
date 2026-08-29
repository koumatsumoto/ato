import { useCallback, useEffect, useRef, useState } from "react";
import {
  createBrowserSpeechRecognition,
  isSpeechRecognitionSupported,
  speechRecognitionErrorMessage,
  type SpeechRecognitionLike,
} from "@/features/actions/lib/speech-recognition";

export type SpeechRecognitionState = "idle" | "requesting" | "listening" | "finalizing" | "error";

interface UseSpeechRecognitionOptions {
  readonly onFinal: (transcript: string) => void;
  readonly createRecognition?: () => SpeechRecognitionLike | null;
}

interface UseSpeechRecognitionResult {
  readonly isSupported: boolean;
  readonly state: SpeechRecognitionState;
  readonly interimTranscript: string;
  readonly errorMessage: string | null;
  readonly start: () => void;
  readonly cancel: () => void;
  readonly reset: () => void;
}

export function useSpeechRecognition({
  onFinal,
  createRecognition = createBrowserSpeechRecognition,
}: UseSpeechRecognitionOptions): UseSpeechRecognitionResult {
  const [state, setState] = useState<SpeechRecognitionState>("idle");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalTranscriptRef = useRef("");
  const cancelledRef = useRef(false);
  const failedRef = useRef(false);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  const releaseRecognition = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    recognition.onstart = null;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onnomatch = null;
    recognition.onend = null;
    recognitionRef.current = null;
  }, []);

  const reset = useCallback(() => {
    setInterimTranscript("");
    setErrorMessage(null);
    setState("idle");
  }, []);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    finalTranscriptRef.current = "";
    recognitionRef.current?.abort();
    releaseRecognition();
    reset();
  }, [releaseRecognition, reset]);

  const start = useCallback(() => {
    if (recognitionRef.current) return;

    const recognition = createRecognition();
    if (!recognition) return;

    cancelledRef.current = false;
    failedRef.current = false;
    finalTranscriptRef.current = "";
    setInterimTranscript("");
    setErrorMessage(null);
    setState("requesting");

    recognition.lang = "ja-JP";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setState("listening");
    };

    recognition.onresult = (event) => {
      let interim = "";
      let final = finalTranscriptRef.current;

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results.item(index);
        const transcript = result.item(0).transcript;
        if (result.isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      finalTranscriptRef.current = final;
      setInterimTranscript(interim);
      if (final) setState("finalizing");
    };

    recognition.onerror = (event) => {
      if (event.error === "aborted" && cancelledRef.current) return;
      failedRef.current = true;
      finalTranscriptRef.current = "";
      releaseRecognition();
      setInterimTranscript("");
      setErrorMessage(speechRecognitionErrorMessage(event.error));
      setState("error");
    };

    recognition.onnomatch = () => {
      failedRef.current = true;
      finalTranscriptRef.current = "";
      releaseRecognition();
      setInterimTranscript("");
      setErrorMessage(speechRecognitionErrorMessage("no-speech"));
      setState("error");
    };

    recognition.onend = () => {
      const transcript = finalTranscriptRef.current;
      releaseRecognition();
      setInterimTranscript("");

      if (!cancelledRef.current && !failedRef.current && transcript) {
        onFinalRef.current(transcript);
      }
      if (!failedRef.current) setState("idle");
      finalTranscriptRef.current = "";
    };

    try {
      recognition.start();
    } catch {
      failedRef.current = true;
      releaseRecognition();
      setErrorMessage(speechRecognitionErrorMessage("start-failed"));
      setState("error");
    }
  }, [createRecognition, releaseRecognition]);

  useEffect(
    () => () => {
      cancelledRef.current = true;
      finalTranscriptRef.current = "";
      recognitionRef.current?.abort();
      releaseRecognition();
    },
    [releaseRecognition],
  );

  return {
    isSupported: createRecognition === createBrowserSpeechRecognition ? isSpeechRecognitionSupported() : true,
    state,
    interimTranscript,
    errorMessage,
    start,
    cancel,
    reset,
  };
}
