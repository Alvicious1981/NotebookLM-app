"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  BookOpen,
  Trash2,
  MoreVertical,
  Search,
  Sparkles,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

interface Notebook {
  id: string;
  title: string;
  description: string | null;
  emoji: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    sources: number;
  };
}

export default function HomePage() {
  const router = useRouter();
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  useEffect(() => {
    fetchNotebooks();
  }, []);

  async function fetchNotebooks() {
    try {
      const res = await fetch("/api/notebooks");
      if (res.ok) {
        const data = await res.json();
        setNotebooks(data);
      }
    } catch (error) {
      console.error("Failed to fetch notebooks:", error);
    } finally {
      setLoading(false);
    }
  }

  async function createNotebook() {
    try {
      const res = await fetch("/api/notebooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled notebook" }),
      });
      if (res.ok) {
        const notebook = await res.json();
        router.push(`/notebook/${notebook.id}`);
      }
    } catch (error) {
      console.error("Failed to create notebook:", error);
    }
  }

  async function deleteNotebook(id: string) {
    try {
      const res = await fetch(`/api/notebooks/${id}`, { method: "DELETE" });
      if (res.ok) {
        setNotebooks((prev) => prev.filter((n) => n.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete notebook:", error);
    }
    setMenuOpen(null);
  }

  const filteredNotebooks = notebooks.filter(
    (n) =>
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-surface-950">
      {/* Header */}
      <header className="border-b border-surface-800">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-7 h-7 text-primary-400" />
            <h1 className="text-xl font-semibold text-surface-100">
              NotebookLM
            </h1>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Welcome section */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-surface-100 mb-2">
            Welcome to NotebookLM
          </h2>
          <p className="text-surface-400">
            Upload your sources and let AI help you learn, summarize, and
            explore your content.
          </p>
        </div>

        {/* Actions bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
            <input
              type="text"
              placeholder="Search notebooks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field w-full pl-10"
            />
          </div>
          <button onClick={createNotebook} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New notebook
          </button>
        </div>

        {/* Notebooks grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="card p-5 animate-pulse"
              >
                <div className="h-10 w-10 bg-surface-700 rounded-lg mb-3" />
                <div className="h-5 bg-surface-700 rounded w-3/4 mb-2" />
                <div className="h-4 bg-surface-700 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredNotebooks.length === 0 ? (
          <div className="text-center py-20">
            {searchQuery ? (
              <>
                <Search className="w-12 h-12 text-surface-600 mx-auto mb-4" />
                <p className="text-surface-400 text-lg">
                  No notebooks match your search
                </p>
              </>
            ) : (
              <>
                <BookOpen className="w-12 h-12 text-surface-600 mx-auto mb-4" />
                <p className="text-surface-400 text-lg mb-4">
                  No notebooks yet
                </p>
                <button onClick={createNotebook} className="btn-primary">
                  Create your first notebook
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNotebooks.map((notebook) => (
              <div
                key={notebook.id}
                className="card p-5 hover:border-surface-600 transition-colors cursor-pointer group relative"
                onClick={() => router.push(`/notebook/${notebook.id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-3xl">{notebook.emoji}</span>
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(
                          menuOpen === notebook.id ? null : notebook.id
                        );
                      }}
                      className="btn-ghost p-1 opacity-0 group-hover:opacity-100"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {menuOpen === notebook.id && (
                      <div className="absolute right-0 top-8 bg-surface-700 border border-surface-600 rounded-lg shadow-xl z-10 py-1 min-w-[140px]">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotebook(notebook.id);
                          }}
                          className="flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-surface-600 w-full text-left text-sm"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <h3 className="font-medium text-surface-100 mb-1">
                  {notebook.title}
                </h3>
                {notebook.description && (
                  <p className="text-sm text-surface-400 mb-2 line-clamp-2">
                    {notebook.description}
                  </p>
                )}
                <div className="flex items-center gap-3 text-xs text-surface-500 mt-3">
                  <span>{notebook._count.sources} sources</span>
                  <span>{formatDate(notebook.updatedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
