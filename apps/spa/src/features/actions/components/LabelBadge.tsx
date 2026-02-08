interface LabelBadgeProps {
  readonly name: string;
  readonly onRemove?: () => void;
}

export function LabelBadge({ name, onRemove }: LabelBadgeProps) {
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
      {name}
      {onRemove !== undefined && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`${name}を削除`}
          className="ml-0.5 rounded-full p-0.5 hover:bg-gray-200 hover:text-gray-800"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  );
}
