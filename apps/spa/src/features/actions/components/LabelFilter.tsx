import { useRef, useState } from "react";
import { useLabels } from "@/features/actions/hooks/use-labels";
import { getRecentLabels } from "@/features/actions/lib/label-store";
import { buildLabelSuggestions } from "@/features/actions/lib/label-suggestions";
import { useClickOutside } from "@/shared/hooks/use-click-outside";
import { LabelBadge } from "./LabelBadge";

interface LabelFilterProps {
  readonly selectedLabel: string;
  readonly onChange: (label: string) => void;
}

export function LabelFilter({ selectedLabel, onChange }: LabelFilterProps) {
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: repoLabels } = useLabels();
  const recentLabels = getRecentLabels();

  const suggestions = buildLabelSuggestions(inputValue, repoLabels ?? [], recentLabels, selectedLabel ? [selectedLabel] : []);

  useClickOutside(containerRef, () => {
    setIsOpen(false);
    setHighlightedIndex(-1);
  });

  const selectLabel = (name: string) => {
    onChange(name);
    setInputValue("");
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const clearLabel = () => {
    onChange("");
    setInputValue("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        selectLabel(suggestions[highlightedIndex]!);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setHighlightedIndex(-1);
    } else if (e.key === "Backspace" && inputValue === "" && selectedLabel) {
      clearLabel();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  if (selectedLabel) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">ラベル:</span>
        <LabelBadge name={selectedLabel} onRemove={clearLabel} />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2">
        <svg className="h-4 w-4 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
          />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder="ラベルで絞り込み..."
          className="w-full border-none bg-transparent py-0.5 text-sm outline-none placeholder:text-gray-400"
          maxLength={50}
          role="combobox"
          aria-expanded={isOpen && suggestions.length > 0}
          aria-controls="label-filter-listbox"
          aria-activedescendant={highlightedIndex >= 0 ? `label-filter-option-${highlightedIndex}` : undefined}
          aria-autocomplete="list"
        />
      </div>

      {isOpen && suggestions.length > 0 && (
        <ul
          id="label-filter-listbox"
          role="listbox"
          className="absolute left-0 right-0 z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
        >
          {suggestions.map((name, index) => (
            <li key={name} id={`label-filter-option-${index}`} role="option" aria-selected={index === highlightedIndex}>
              <button
                type="button"
                onClick={() => selectLabel(name)}
                tabIndex={-1}
                className={`w-full px-3 py-2 text-left text-sm ${
                  index === highlightedIndex ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
