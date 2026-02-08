import { useCallback, useRef, useState } from "react";
import { useLabels } from "@/features/actions/hooks/use-labels";
import { getRecentLabels, addRecentLabels } from "@/features/actions/lib/label-store";
import { buildLabelSuggestions } from "@/features/actions/lib/label-suggestions";
import { labelSchema } from "@/features/actions/lib/validation";
import { useClickOutside } from "@/shared/hooks/use-click-outside";
import { LabelBadge } from "./LabelBadge";

interface LabelEditorProps {
  readonly labels: readonly string[];
  readonly onChange: (labels: readonly string[]) => void;
}

export function LabelEditor({ labels, onChange }: LabelEditorProps) {
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: repoLabels } = useLabels();
  const recentLabels = getRecentLabels();

  const suggestions = buildLabelSuggestions(inputValue, repoLabels ?? [], recentLabels, labels);

  const showCreateOption = inputValue.trim().length > 0 && !suggestions.includes(inputValue.trim()) && !labels.includes(inputValue.trim());

  useClickOutside(containerRef, () => {
    setIsOpen(false);
    setHighlightedIndex(-1);
  });

  const addLabel = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed || labels.includes(trimmed)) return;

      const result = labelSchema.safeParse(trimmed);
      if (!result.success) return;

      const newLabels = [...labels, trimmed];
      onChange(newLabels);
      addRecentLabels([trimmed]);
      setInputValue("");
      setHighlightedIndex(-1);
      inputRef.current?.focus();
    },
    [labels, onChange],
  );

  const removeLabel = useCallback(
    (name: string) => {
      onChange(labels.filter((l) => l !== name));
    },
    [labels, onChange],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const totalItems = suggestions.length + (showCreateOption ? 1 : 0);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        addLabel(suggestions[highlightedIndex]!);
      } else if (highlightedIndex === suggestions.length && showCreateOption) {
        addLabel(inputValue.trim());
      } else if (inputValue.trim()) {
        addLabel(inputValue.trim());
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setHighlightedIndex(-1);
    } else if (e.key === "Backspace" && inputValue === "" && labels.length > 0) {
      removeLabel(labels[labels.length - 1]!);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleFocus = () => {
    setIsOpen(true);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="flex flex-wrap items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 focus-within:border-blue-500 focus-within:bg-white">
        {labels.map((label) => (
          <LabelBadge key={label} name={label} onRemove={() => removeLabel(label)} />
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder={labels.length === 0 ? "ラベルを追加..." : ""}
          className="min-w-[80px] flex-1 border-none bg-transparent py-0.5 text-sm outline-none placeholder:text-gray-400"
          maxLength={50}
          role="combobox"
          aria-expanded={isOpen && (suggestions.length > 0 || showCreateOption)}
          aria-controls="label-editor-listbox"
          aria-activedescendant={highlightedIndex >= 0 ? `label-editor-option-${highlightedIndex}` : undefined}
          aria-autocomplete="list"
        />
      </div>

      {isOpen && (suggestions.length > 0 || showCreateOption) && (
        <ul
          id="label-editor-listbox"
          role="listbox"
          className="absolute left-0 right-0 z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
        >
          {suggestions.map((name, index) => (
            <li key={name} id={`label-editor-option-${index}`} role="option" aria-selected={index === highlightedIndex}>
              <button
                type="button"
                onClick={() => addLabel(name)}
                tabIndex={-1}
                className={`w-full px-3 py-2 text-left text-sm ${
                  index === highlightedIndex ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {name}
              </button>
            </li>
          ))}
          {showCreateOption && (
            <li id={`label-editor-option-${suggestions.length}`} role="option" aria-selected={highlightedIndex === suggestions.length}>
              <button
                type="button"
                onClick={() => addLabel(inputValue.trim())}
                tabIndex={-1}
                className={`w-full px-3 py-2 text-left text-sm ${
                  highlightedIndex === suggestions.length ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                &quot;{inputValue.trim()}&quot; を作成
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
