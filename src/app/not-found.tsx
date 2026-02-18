import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-6">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-surface-700 mb-4">404</h1>
        <h2 className="text-lg font-semibold text-surface-100 mb-2">
          Page not found
        </h2>
        <p className="text-sm text-surface-400 mb-6 max-w-sm">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link href="/" className="btn-primary inline-block">
          Back to notebooks
        </Link>
      </div>
    </div>
  );
}
