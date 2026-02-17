"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft } from "lucide-react";

export default function NotebookError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("Notebook error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-6">
      <div className="card p-8 max-w-md text-center">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-surface-100 mb-2">
          Failed to load notebook
        </h2>
        <p className="text-sm text-surface-400 mb-6">
          This notebook could not be loaded. It may have been deleted or an
          error occurred.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => router.push("/")}
            className="btn-secondary flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to notebooks
          </button>
          <button onClick={reset} className="btn-primary">
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
