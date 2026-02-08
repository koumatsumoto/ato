interface ErrorBannerProps {
  readonly error: Error;
  readonly onRetry?: () => void;
  readonly onDismiss?: () => void;
}

export function ErrorBanner({ error, onRetry, onDismiss }: ErrorBannerProps) {
  return (
    <div role="alert" className="border-l-4 border-red-500 bg-red-50 px-4 py-3">
      <p className="text-sm text-red-700">{error.message}</p>
      {(onRetry || onDismiss) && (
        <div className="mt-2 flex gap-2">
          {onRetry && (
            <button onClick={onRetry} className="text-sm font-medium text-red-700 underline">
              Retry
            </button>
          )}
          {onDismiss && (
            <button onClick={onDismiss} className="text-sm text-red-500">
              Dismiss
            </button>
          )}
        </div>
      )}
    </div>
  );
}
