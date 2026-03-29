export function CheckCircleIcon({ className = "h-5 w-5" }: { readonly className?: string }): React.JSX.Element {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      data-testid="check-circle-icon"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m9 12.75 2.25 2.25L15 9.75" />
    </svg>
  );
}
