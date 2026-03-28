export function CheckCircleSolidIcon({ className = "h-5 w-5" }: { readonly className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" data-testid="check-circle-solid-icon">
      <circle cx="12" cy="12" r="10" fill="var(--color-completed)" />
      <path d="m8.5 12.5 2.5 2.5 5-5" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}
