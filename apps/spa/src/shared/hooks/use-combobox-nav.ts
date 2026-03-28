import { useCallback, useState } from "react";

interface UseComboboxNavParams {
  readonly itemCount: number;
  readonly inputIsEmpty: boolean;
  readonly onSelect: (index: number) => void;
  readonly onInputSubmit?: () => void;
  readonly onBackspace?: () => void;
}

interface UseComboboxNavResult {
  readonly isOpen: boolean;
  readonly highlightedIndex: number;
  readonly open: () => void;
  readonly close: () => void;
  readonly resetHighlight: () => void;
  readonly handleKeyDown: (e: React.KeyboardEvent) => void;
  readonly onInputChange: () => void;
}

export function useComboboxNav({ itemCount, inputIsEmpty, onSelect, onInputSubmit, onBackspace }: UseComboboxNavParams): UseComboboxNavResult {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setHighlightedIndex(-1);
  }, []);

  const resetHighlight = useCallback(() => {
    setHighlightedIndex(-1);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setIsOpen(true);
        setHighlightedIndex((prev) => (prev < itemCount - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : itemCount - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < itemCount) {
          onSelect(highlightedIndex);
        } else {
          onInputSubmit?.();
        }
        setHighlightedIndex(-1);
      } else if (e.key === "Escape") {
        setIsOpen(false);
        setHighlightedIndex(-1);
      } else if (e.key === "Backspace" && inputIsEmpty) {
        onBackspace?.();
      }
    },
    [itemCount, highlightedIndex, inputIsEmpty, onSelect, onInputSubmit, onBackspace],
  );

  const onInputChange = useCallback(() => {
    setIsOpen(true);
    setHighlightedIndex(-1);
  }, []);

  return { isOpen, highlightedIndex, open, close, resetHighlight, handleKeyDown, onInputChange };
}
