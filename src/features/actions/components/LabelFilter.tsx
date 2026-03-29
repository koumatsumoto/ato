import { useRef, useState } from "react";
import { useLabels } from "@/features/actions/hooks/use-labels";
import { getRecentLabels } from "@/features/actions/lib/label-store";
import { buildLabelSuggestions } from "@/features/actions/lib/label-suggestions";
import { useClickOutside } from "@/shared/hooks/use-click-outside";
import { useComboboxNav } from "@/shared/hooks/use-combobox-nav";
import { LabelBadge } from "./LabelBadge";

interface LabelFilterProps {
  readonly selectedLabel: string;
  readonly onChange: (label: string) => void;
}

export function LabelFilter({ selectedLabel, onChange }: LabelFilterProps): React.JSX.Element {
  const [inputValue, setInputValue] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: repoLabels } = useLabels();
  const recentLabels = getRecentLabels();

  const suggestions = buildLabelSuggestions(inputValue, repoLabels ?? [], recentLabels, selectedLabel ? [selectedLabel] : []);

  const selectLabel = (name: string) => {
    onChange(name);
    setInputValue("");
    nav.close();
  };

  const clearLabel = () => {
    onChange("");
    setInputValue("");
    inputRef.current?.focus();
  };

  const nav = useComboboxNav({
    itemCount: suggestions.length,
    inputIsEmpty: inputValue === "",
    onSelect: (index) => {
      const suggestion = suggestions[index];
      if (suggestion !== undefined) selectLabel(suggestion);
    },
    onBackspace: () => {
      if (selectedLabel) clearLabel();
    },
  });

  useClickOutside(containerRef, nav.close);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    nav.onInputChange();
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
        <svg
          className="h-4 w-4 shrink-0 text-gray-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
          <path d="M6 6h.008v.008H6V6Z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={nav.handleKeyDown}
          onFocus={nav.open}
          placeholder="ラベルで絞り込み..."
          className="w-full border-none bg-transparent py-0.5 text-sm outline-none placeholder:text-gray-400"
          maxLength={50}
          role="combobox"
          aria-expanded={nav.isOpen && suggestions.length > 0}
          aria-controls="label-filter-listbox"
          aria-activedescendant={nav.highlightedIndex >= 0 ? `label-filter-option-${String(nav.highlightedIndex)}` : undefined}
          aria-autocomplete="list"
        />
      </div>

      {nav.isOpen && suggestions.length > 0 && (
        <ul
          id="label-filter-listbox"
          role="listbox"
          className="absolute left-0 right-0 z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
        >
          {suggestions.map((name, index) => (
            <li key={name} id={`label-filter-option-${String(index)}`} role="option" aria-selected={index === nav.highlightedIndex}>
              <button
                type="button"
                onClick={() => {
                  selectLabel(name);
                }}
                tabIndex={-1}
                className={`w-full px-3 py-2 text-left text-sm ${
                  index === nav.highlightedIndex ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"
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
