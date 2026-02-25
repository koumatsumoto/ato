import { useCallback, useRef, useState } from "react";
import { useLabels } from "@/features/actions/hooks/use-labels";
import { getRecentLabels, addRecentLabels } from "@/features/actions/lib/label-store";
import { buildLabelSuggestions } from "@/features/actions/lib/label-suggestions";
import { labelSchema } from "@/features/actions/lib/validation";
import { useClickOutside } from "@/shared/hooks/use-click-outside";
import { useComboboxNav } from "@/shared/hooks/use-combobox-nav";
import { LabelBadge } from "./LabelBadge";

interface LabelEditorProps {
  readonly labels: readonly string[];
  readonly onChange: (labels: readonly string[]) => void;
}

export function LabelEditor({ labels, onChange }: LabelEditorProps) {
  const [inputValue, setInputValue] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: repoLabels } = useLabels();
  const recentLabels = getRecentLabels();

  const suggestions = buildLabelSuggestions(inputValue, repoLabels ?? [], recentLabels, labels);
  const showCreateOption = inputValue.trim().length > 0 && !suggestions.includes(inputValue.trim()) && !labels.includes(inputValue.trim());

  const addLabel = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed || labels.includes(trimmed)) return;

      const result = labelSchema.safeParse(trimmed);
      if (!result.success) return;

      onChange([...labels, trimmed]);
      addRecentLabels([trimmed]);
      setInputValue("");
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

  const nav = useComboboxNav({
    itemCount: suggestions.length + (showCreateOption ? 1 : 0),
    inputIsEmpty: inputValue === "",
    onSelect: (index) => {
      if (index < suggestions.length) {
        addLabel(suggestions[index]!);
      } else {
        addLabel(inputValue.trim());
      }
    },
    onInputSubmit: () => {
      if (inputValue.trim()) {
        addLabel(inputValue.trim());
      }
    },
    onBackspace: () => {
      if (labels.length > 0) removeLabel(labels[labels.length - 1]!);
    },
  });

  useClickOutside(containerRef, nav.close);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    nav.onInputChange();
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
          onKeyDown={nav.handleKeyDown}
          onFocus={nav.open}
          placeholder={labels.length === 0 ? "ラベルを追加..." : ""}
          className="min-w-[80px] flex-1 border-none bg-transparent py-0.5 text-sm outline-none placeholder:text-gray-400"
          maxLength={50}
          role="combobox"
          aria-expanded={nav.isOpen && (suggestions.length > 0 || showCreateOption)}
          aria-controls="label-editor-listbox"
          aria-activedescendant={nav.highlightedIndex >= 0 ? `label-editor-option-${nav.highlightedIndex}` : undefined}
          aria-autocomplete="list"
        />
      </div>

      {nav.isOpen && (suggestions.length > 0 || showCreateOption) && (
        <ul
          id="label-editor-listbox"
          role="listbox"
          className="absolute left-0 right-0 z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
        >
          {suggestions.map((name, index) => (
            <li key={name} id={`label-editor-option-${index}`} role="option" aria-selected={index === nav.highlightedIndex}>
              <button
                type="button"
                onClick={() => addLabel(name)}
                tabIndex={-1}
                className={`w-full px-3 py-2 text-left text-sm ${
                  index === nav.highlightedIndex ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {name}
              </button>
            </li>
          ))}
          {showCreateOption && (
            <li id={`label-editor-option-${suggestions.length}`} role="option" aria-selected={nav.highlightedIndex === suggestions.length}>
              <button
                type="button"
                onClick={() => addLabel(inputValue.trim())}
                tabIndex={-1}
                className={`w-full px-3 py-2 text-left text-sm ${
                  nav.highlightedIndex === suggestions.length ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:bg-gray-50"
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
