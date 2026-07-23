export function LoadingSpinner({ label = "Synchronizing VayuRaksha intelligence..." }: { label?: string }) {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <span className="spinner" />
      <span>{label}</span>
    </div>
  );
}

