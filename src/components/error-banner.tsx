export function ErrorBanner({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
    >
      {message}
    </div>
  );
}
