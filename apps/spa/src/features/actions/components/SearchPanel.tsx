import { useRef, useState } from "react";
import { LabelFilter } from "./LabelFilter";

interface SearchPanelProps {
  readonly onSearchChange: (query: string, includeCompleted: boolean, label: string) => void;
}

export function SearchPanel({ onSearchChange }: SearchPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [includeCompleted, setIncludeCompleted] = useState(false);
  const [labelFilter, setLabelFilter] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleOpen = () => {
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleClose = () => {
    setIsOpen(false);
    setQuery("");
    setIncludeCompleted(false);
    setLabelFilter("");
    onSearchChange("", false, "");
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    onSearchChange(value, includeCompleted, labelFilter);
  };

  const handleIncludeCompletedChange = (checked: boolean) => {
    setIncludeCompleted(checked);
    onSearchChange(query, checked, labelFilter);
  };

  const handleLabelFilterChange = (label: string) => {
    setLabelFilter(label);
    onSearchChange(query, includeCompleted, label);
  };

  if (!isOpen) {
    return (
      <div className="flex justify-end">
        <button onClick={handleOpen} aria-label="検索" className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn space-y-2 py-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="やることを検索..."
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
          />
        </div>
        <button
          onClick={handleClose}
          aria-label="検索を閉じる"
          className="shrink-0 rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="pl-2">
        <LabelFilter selectedLabel={labelFilter} onChange={handleLabelFilterChange} />
      </div>
      <label className="flex items-center gap-2 pl-2 text-sm text-gray-500">
        <input type="checkbox" checked={includeCompleted} onChange={(e) => handleIncludeCompletedChange(e.target.checked)} className="rounded" />
        完了を表示
      </label>
    </div>
  );
}
