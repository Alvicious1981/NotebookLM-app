"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Send,
  FileText,
  Trash2,
  X,
  BookOpen,
  ClipboardList,
  HelpCircle,
  FileBarChart,
  Clock,
  Mic,
  PenLine,
  ChevronDown,
  ChevronRight,
  Loader2,
  Upload,
  Link,
  Type,
  Sparkles,
  Copy,
  Check,
  PanelLeftOpen,
  PanelRightOpen,
  Search,
  MoreVertical,
  Save,
  Edit3,
  MessageSquareX,
  CheckCircle2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useDropzone } from "react-dropzone";
import { cn, formatDate, formatFileSize } from "@/lib/utils";

interface Source {
  id: string;
  title: string;
  content?: string; // Optional — loaded on demand
  type: string;
  fileName: string | null;
  fileSize: number | null;
  createdAt: string;
}

interface ChatMessage {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

interface Note {
  id: string;
  title: string;
  content: string;
  type: string;
  createdAt: string;
  updatedAt: string;
}

interface Notebook {
  id: string;
  title: string;
  description: string | null;
  emoji: string;
  sources: Source[];
  messages: ChatMessage[];
  notes: Note[];
}

const NOTE_TYPES = [
  { type: "SUMMARY", label: "Summary", icon: FileBarChart },
  { type: "STUDY_GUIDE", label: "Study Guide", icon: ClipboardList },
  { type: "BRIEFING", label: "Briefing Doc", icon: FileText },
  { type: "FAQ", label: "FAQ", icon: HelpCircle },
  { type: "TIMELINE", label: "Timeline", icon: Clock },
  { type: "PODCAST_SCRIPT", label: "Podcast Script", icon: Mic },
];

type AddSourceMode = "text" | "url" | null;

export default function NotebookPage() {
  const router = useRouter();
  const params = useParams();
  const notebookId = params.id as string;

  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [loading, setLoading] = useState(true);

  // Title editing
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState("");

  // Sources panel
  const [sourcesExpanded, setSourcesExpanded] = useState(true);
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [loadingSource, setLoadingSource] = useState(false);
  const [addSourceMode, setAddSourceMode] = useState<AddSourceMode>(null);
  const [newSourceTitle, setNewSourceTitle] = useState("");
  const [newSourceContent, setNewSourceContent] = useState("");
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [addingSource, setAddingSource] = useState(false);

  // Chat
  const [chatInput, setChatInput] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Notes panel
  const [notesExpanded, setNotesExpanded] = useState(true);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [generatingNote, setGeneratingNote] = useState<string | null>(null);

  // UX: error/success toast + clipboard
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Source editing
  const [editingSource, setEditingSource] = useState(false);
  const [editSourceTitle, setEditSourceTitle] = useState("");
  const [editSourceContent, setEditSourceContent] = useState("");
  const [savingSource, setSavingSource] = useState(false);

  // Description/emoji editing
  const [editingDescription, setEditingDescription] = useState(false);
  const [editDescription, setEditDescription] = useState("");

  // Mobile: panel toggles (hidden by default on small screens)
  const [showLeftPanel, setShowLeftPanel] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(false);

  // Search filters
  const [sourceSearch, setSourceSearch] = useState("");
  const [noteSearch, setNoteSearch] = useState("");

  // Note editing
  const [editingNote, setEditingNote] = useState(false);
  const [editNoteTitle, setEditNoteTitle] = useState("");
  const [editNoteContent, setEditNoteContent] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // Notebook header menu (delete)
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);

  // Escape key to close panels / viewers
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (editingNote) { setEditingNote(false); return; }
        if (editingSource) { setEditingSource(false); return; }
        if (editingDescription) { setEditingDescription(false); return; }
        if (headerMenuOpen) { setHeaderMenuOpen(false); return; }
        if (selectedSource) { setSelectedSource(null); return; }
        if (selectedNote) { setSelectedNote(null); return; }
        if (addSourceMode) { setAddSourceMode(null); return; }
        if (showLeftPanel) { setShowLeftPanel(false); return; }
        if (showRightPanel) { setShowRightPanel(false); return; }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedSource, selectedNote, addSourceMode, showLeftPanel, showRightPanel, editingNote, editingSource, editingDescription, headerMenuOpen]);

  // Auto-clear toasts after 4s
  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 4000);
      return () => clearTimeout(t);
    }
  }, [error]);
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  // Auto-save debounce for notes
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveNoteRef = useRef<{ id: string; title: string; content: string } | null>(null);

  const fetchNotebook = useCallback(async () => {
    try {
      const res = await fetch(`/api/notebooks/${notebookId}`);
      if (res.ok) {
        const data = await res.json();
        setNotebook(data);
        setEditTitle(data.title);
      } else {
        router.push("/");
      }
    } catch {
      router.push("/");
    } finally {
      setLoading(false);
    }
  }, [notebookId, router]);

  useEffect(() => {
    fetchNotebook();
  }, [fetchNotebook]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [notebook?.messages]);

  // Auto-save effect for note editing
  useEffect(() => {
    if (!editingNote || !selectedNote) return;
    autoSaveNoteRef.current = {
      id: selectedNote.id,
      title: editNoteTitle,
      content: editNoteContent,
    };
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      const ref = autoSaveNoteRef.current;
      if (!ref) return;
      try {
        const res = await fetch(
          `/api/notebooks/${notebookId}/notes/${ref.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: ref.title.trim() || "Untitled", content: ref.content }),
          }
        );
        if (res.ok) {
          const updated = await res.json();
          setNotebook((prev) =>
            prev
              ? { ...prev, notes: prev.notes.map((n) => (n.id === updated.id ? updated : n)) }
              : prev
          );
        }
      } catch { /* silent auto-save */ }
    }, 1500);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [editNoteTitle, editNoteContent, editingNote, selectedNote, notebookId]);

  // --- Actions ---

  async function updateTitle() {
    if (!editTitle.trim() || editTitle === notebook?.title) {
      setEditTitle(notebook?.title || "");
      setIsEditingTitle(false);
      return;
    }
    try {
      await fetch(`/api/notebooks/${notebookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle.trim() }),
      });
      setNotebook((prev) =>
        prev ? { ...prev, title: editTitle.trim() } : prev
      );
    } catch {
      setEditTitle(notebook?.title || "");
    }
    setIsEditingTitle(false);
  }

  // Fase 2.2: Load source content on demand
  async function selectSource(source: Source) {
    setSelectedNote(null);
    if (source.content !== undefined) {
      setSelectedSource(source);
      return;
    }
    setLoadingSource(true);
    try {
      const res = await fetch(
        `/api/notebooks/${notebookId}/sources/${source.id}`
      );
      if (res.ok) {
        const fullSource = await res.json();
        // Cache in local state
        setNotebook((prev) =>
          prev
            ? {
                ...prev,
                sources: prev.sources.map((s) =>
                  s.id === source.id ? fullSource : s
                ),
              }
            : prev
        );
        setSelectedSource(fullSource);
      } else {
        setError("Failed to load source content");
      }
    } catch {
      setError("Failed to load source content");
    }
    setLoadingSource(false);
  }

  async function addSource() {
    if (addSourceMode === "url" && !newSourceUrl.trim()) return;
    if (addSourceMode === "text" && !newSourceContent.trim()) return;

    setAddingSource(true);
    try {
      let title = newSourceTitle.trim();
      let content = newSourceContent.trim();
      let type = "TEXT";

      if (addSourceMode === "url") {
        type = "URL";
        content = newSourceUrl.trim();
        if (!title) title = content.slice(0, 60);
      } else {
        if (!title)
          title = content.split("\n")[0].slice(0, 60) || "Untitled source";
        type = "PASTE";
      }

      const res = await fetch(`/api/notebooks/${notebookId}/sources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, type }),
      });

      if (res.ok) {
        const newSource = await res.json();
        // Fase 2.3: Local state update instead of full refetch
        setNotebook((prev) =>
          prev ? { ...prev, sources: [newSource, ...prev.sources] } : prev
        );
        setNewSourceTitle("");
        setNewSourceContent("");
        setNewSourceUrl("");
        setAddSourceMode(null);
        setSuccess("Source added");
      } else {
        setError("Failed to add source");
      }
    } catch {
      setError("Failed to add source");
    }
    setAddingSource(false);
  }

  async function deleteSource(sourceId: string) {
    if (!window.confirm("Delete this source? This cannot be undone.")) return;
    try {
      const res = await fetch(
        `/api/notebooks/${notebookId}/sources/${sourceId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setNotebook((prev) =>
          prev
            ? {
                ...prev,
                sources: prev.sources.filter((s) => s.id !== sourceId),
              }
            : prev
        );
        if (selectedSource?.id === sourceId) setSelectedSource(null);
      } else {
        setError("Failed to delete source");
      }
    } catch {
      setError("Failed to delete source");
    }
  }

  async function sendMessage() {
    if (!chatInput.trim() || sendingMessage) return;
    const message = chatInput.trim();
    setChatInput("");
    setSendingMessage(true);

    // Optimistic update
    const tempUserMsg: ChatMessage = {
      id: "temp-user",
      role: "user",
      content: message,
      createdAt: new Date().toISOString(),
    };
    setNotebook((prev) =>
      prev ? { ...prev, messages: [...prev.messages, tempUserMsg] } : prev
    );

    try {
      const res = await fetch(`/api/notebooks/${notebookId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      if (res.ok) {
        // Fase 2.3: Append assistant reply instead of full refetch
        const assistantMsg = await res.json();
        setNotebook((prev) => {
          if (!prev) return prev;
          const withoutTemp = prev.messages.filter(
            (m) => m.id !== "temp-user"
          );
          return {
            ...prev,
            messages: [
              ...withoutTemp,
              {
                id: `user-${Date.now()}`,
                role: "user",
                content: message,
                createdAt: new Date().toISOString(),
              },
              assistantMsg,
            ],
          };
        });
      } else {
        setError("Failed to get response");
        // Remove optimistic message
        setNotebook((prev) =>
          prev
            ? {
                ...prev,
                messages: prev.messages.filter((m) => m.id !== "temp-user"),
              }
            : prev
        );
      }
    } catch {
      setError("Failed to send message");
      setNotebook((prev) =>
        prev
          ? {
              ...prev,
              messages: prev.messages.filter((m) => m.id !== "temp-user"),
            }
          : prev
      );
    }
    setSendingMessage(false);
  }

  async function generateNote(type: string) {
    setGeneratingNote(type);
    try {
      const res = await fetch(`/api/notebooks/${notebookId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });

      if (res.ok) {
        // Fase 2.3: Local state update
        const note = await res.json();
        setNotebook((prev) =>
          prev ? { ...prev, notes: [note, ...prev.notes] } : prev
        );
        setSelectedNote(note);
        setSelectedSource(null);
        setSuccess("Note generated");
      } else {
        setError("Failed to generate note");
      }
    } catch {
      setError("Failed to generate note");
    }
    setGeneratingNote(null);
  }

  async function deleteNote(noteId: string) {
    if (!window.confirm("Delete this note? This cannot be undone.")) return;
    try {
      const res = await fetch(
        `/api/notebooks/${notebookId}/notes/${noteId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setNotebook((prev) =>
          prev
            ? { ...prev, notes: prev.notes.filter((n) => n.id !== noteId) }
            : prev
        );
        if (selectedNote?.id === noteId) setSelectedNote(null);
      } else {
        setError("Failed to delete note");
      }
    } catch {
      setError("Failed to delete note");
    }
  }

  async function createNote() {
    try {
      const res = await fetch(`/api/notebooks/${notebookId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "New note",
          content: "",
          type: "NOTE",
        }),
      });
      if (res.ok) {
        // Fase 2.3: Local state update
        const note = await res.json();
        setNotebook((prev) =>
          prev ? { ...prev, notes: [note, ...prev.notes] } : prev
        );
        setSelectedNote(note);
        setSelectedSource(null);
      } else {
        setError("Failed to create note");
      }
    } catch {
      setError("Failed to create note");
    }
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Failed to copy to clipboard");
    }
  }

  // Note editing
  function startEditingNote() {
    if (!selectedNote) return;
    setEditNoteTitle(selectedNote.title);
    setEditNoteContent(selectedNote.content);
    setEditingNote(true);
  }

  async function saveNote() {
    if (!selectedNote) return;
    setSavingNote(true);
    try {
      const res = await fetch(
        `/api/notebooks/${notebookId}/notes/${selectedNote.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: editNoteTitle.trim() || selectedNote.title,
            content: editNoteContent,
          }),
        }
      );
      if (res.ok) {
        const updated = await res.json();
        setNotebook((prev) =>
          prev
            ? {
                ...prev,
                notes: prev.notes.map((n) =>
                  n.id === updated.id ? updated : n
                ),
              }
            : prev
        );
        setSelectedNote(updated);
        setEditingNote(false);
        setSuccess("Note saved");
      } else {
        setError("Failed to save note");
      }
    } catch {
      setError("Failed to save note");
    }
    setSavingNote(false);
  }

  // Delete notebook from within
  async function deleteNotebook() {
    if (
      !window.confirm(
        "Delete this notebook and all its contents? This cannot be undone."
      )
    )
      return;
    try {
      const res = await fetch(`/api/notebooks/${notebookId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/");
      } else {
        setError("Failed to delete notebook");
      }
    } catch {
      setError("Failed to delete notebook");
    }
  }

  // File upload handler
  async function handleFileDrop(acceptedFiles: File[]) {
    for (const file of acceptedFiles) {
      const text = await file.text();
      if (!text.trim()) continue;

      setAddingSource(true);
      try {
        const res = await fetch(`/api/notebooks/${notebookId}/sources`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: file.name,
            content: text,
            type: "FILE",
            fileName: file.name,
            fileSize: file.size,
          }),
        });
        if (res.ok) {
          const newSource = await res.json();
          setNotebook((prev) =>
            prev ? { ...prev, sources: [newSource, ...prev.sources] } : prev
          );
          setSuccess(`Uploaded ${file.name}`);
        } else {
          const data = await res.json().catch(() => null);
          setError(data?.error || `Failed to upload ${file.name}`);
        }
      } catch {
        setError(`Failed to upload ${file.name}`);
      }
      setAddingSource(false);
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFileDrop,
    accept: {
      "text/plain": [".txt"],
      "text/markdown": [".md"],
      "text/csv": [".csv"],
      "application/json": [".json"],
    },
    noClick: true,
  });

  // Source editing
  function startEditingSource() {
    if (!selectedSource) return;
    setEditSourceTitle(selectedSource.title);
    setEditSourceContent(selectedSource.content || "");
    setEditingSource(true);
  }

  async function saveSource() {
    if (!selectedSource) return;
    setSavingSource(true);
    try {
      const res = await fetch(
        `/api/notebooks/${notebookId}/sources/${selectedSource.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: editSourceTitle.trim() || selectedSource.title,
            content: editSourceContent,
          }),
        }
      );
      if (res.ok) {
        const updated = await res.json();
        setNotebook((prev) =>
          prev
            ? { ...prev, sources: prev.sources.map((s) => (s.id === updated.id ? updated : s)) }
            : prev
        );
        setSelectedSource(updated);
        setEditingSource(false);
        setSuccess("Source saved");
      } else {
        setError("Failed to save source");
      }
    } catch {
      setError("Failed to save source");
    }
    setSavingSource(false);
  }

  // Description editing
  async function updateDescription() {
    const desc = editDescription.trim();
    try {
      await fetch(`/api/notebooks/${notebookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: desc || null }),
      });
      setNotebook((prev) =>
        prev ? { ...prev, description: desc || null } : prev
      );
    } catch { /* silent */ }
    setEditingDescription(false);
  }

  // Emoji editing
  async function updateEmoji(emoji: string) {
    try {
      await fetch(`/api/notebooks/${notebookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
      setNotebook((prev) => (prev ? { ...prev, emoji } : prev));
    } catch { /* silent */ }
  }

  // Clear chat history
  async function clearChat() {
    if (!window.confirm("Clear all chat messages? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/notebooks/${notebookId}/chat`, {
        method: "DELETE",
      });
      if (res.ok) {
        setNotebook((prev) => (prev ? { ...prev, messages: [] } : prev));
        setSuccess("Chat cleared");
      } else {
        setError("Failed to clear chat");
      }
    } catch {
      setError("Failed to clear chat");
    }
  }

  // Filtered lists
  const filteredSources = notebook
    ? notebook.sources.filter((s) =>
        s.title.toLowerCase().includes(sourceSearch.toLowerCase())
      )
    : [];
  const filteredNotes = notebook
    ? notebook.notes.filter(
        (n) =>
          n.title.toLowerCase().includes(noteSearch.toLowerCase()) ||
          n.type.toLowerCase().includes(noteSearch.toLowerCase())
      )
    : [];

  // --- Render ---

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
      </div>
    );
  }

  if (!notebook) return null;

  return (
    <div className="h-screen bg-surface-950 flex flex-col overflow-hidden">
      {/* Toasts */}
      {error && (
        <div className="fixed top-4 right-4 z-50 bg-red-900/90 border border-red-700 text-red-200 px-4 py-3 rounded-lg shadow-lg text-sm flex items-center gap-2 max-w-md animate-in fade-in">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-200 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {success && (
        <div className="fixed top-4 right-4 z-50 bg-green-900/90 border border-green-700 text-green-200 px-4 py-3 rounded-lg shadow-lg text-sm flex items-center gap-2 max-w-md animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-surface-800 px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={() => router.push("/")} className="btn-ghost p-2" aria-label="Back to notebooks">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShowLeftPanel(!showLeftPanel)}
          className="btn-ghost p-2 lg:hidden"
          aria-label="Toggle sources panel"
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>
        <button
          className="text-2xl hover:scale-110 transition-transform"
          title="Change emoji"
          onClick={() => {
            const emojis = ["📓", "📕", "📗", "📘", "📙", "📚", "🔬", "🧪", "🎯", "💡", "🧠", "📝", "🗂️", "🔍", "🎓", "📊"];
            const current = emojis.indexOf(notebook.emoji);
            updateEmoji(emojis[(current + 1) % emojis.length]);
          }}
        >
          {notebook.emoji}
        </button>
        <div className="min-w-0">
          {isEditingTitle ? (
            <input
              autoFocus
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={updateTitle}
              onKeyDown={(e) => e.key === "Enter" && updateTitle()}
              className="input-field text-lg font-semibold w-full max-w-md"
              aria-label="Notebook title"
            />
          ) : (
            <h1
              className="text-lg font-semibold text-surface-100 cursor-pointer hover:text-primary-400 transition-colors truncate"
              onClick={() => setIsEditingTitle(true)}
            >
              {notebook.title}
            </h1>
          )}
          {editingDescription ? (
            <input
              autoFocus
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              onBlur={updateDescription}
              onKeyDown={(e) => e.key === "Enter" && updateDescription()}
              placeholder="Add a description..."
              className="input-field text-xs w-full max-w-md mt-0.5"
            />
          ) : (
            <p
              className="text-xs text-surface-500 truncate cursor-pointer hover:text-surface-400 transition-colors"
              onClick={() => {
                setEditDescription(notebook.description || "");
                setEditingDescription(true);
              }}
            >
              {notebook.description || "Add a description..."}
            </p>
          )}
        </div>
        <div className="flex-1" />
        <div className="relative">
          <button
            onClick={() => setHeaderMenuOpen(!headerMenuOpen)}
            className="btn-ghost p-2"
            aria-label="Notebook options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {headerMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setHeaderMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-50 bg-surface-800 border border-surface-700 rounded-lg shadow-xl py-1 min-w-[180px]">
                {notebook.messages.length > 0 && (
                  <button
                    onClick={() => {
                      setHeaderMenuOpen(false);
                      clearChat();
                    }}
                    className="w-full px-3 py-2 text-sm text-surface-300 hover:bg-surface-700 text-left flex items-center gap-2"
                  >
                    <MessageSquareX className="w-3.5 h-3.5" />
                    Clear chat history
                  </button>
                )}
                <button
                  onClick={() => {
                    setHeaderMenuOpen(false);
                    deleteNotebook();
                  }}
                  className="w-full px-3 py-2 text-sm text-red-400 hover:bg-surface-700 text-left flex items-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete notebook
                </button>
              </div>
            </>
          )}
        </div>
        <button
          onClick={() => setShowRightPanel(!showRightPanel)}
          className="btn-ghost p-2 lg:hidden"
          aria-label="Toggle studio panel"
        >
          <PanelRightOpen className="w-4 h-4" />
        </button>
      </header>

      {/* Main content: 3-column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Mobile overlay backdrop */}
        {(showLeftPanel || showRightPanel) && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => { setShowLeftPanel(false); setShowRightPanel(false); }}
          />
        )}

        {/* LEFT: Sources panel */}
        <aside
          className={cn(
            "w-72 border-r border-surface-800 flex flex-col shrink-0 bg-surface-950",
            "max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-40 max-lg:pt-14 max-lg:transition-transform max-lg:duration-200",
            showLeftPanel ? "max-lg:translate-x-0" : "max-lg:-translate-x-full"
          )}
          role="complementary"
          aria-label="Sources panel"
        >
          <div className="p-3 border-b border-surface-800">
            <button
              onClick={() => setSourcesExpanded(!sourcesExpanded)}
              className="flex items-center gap-2 text-sm font-medium text-surface-300 w-full"
              aria-expanded={sourcesExpanded}
              aria-controls="sources-list"
            >
              {sourcesExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              Sources ({notebook.sources.length})
            </button>
          </div>

          {sourcesExpanded && (
            <div id="sources-list" className="flex-1 overflow-y-auto flex flex-col" role="list">
              {notebook.sources.length > 3 && (
                <div className="px-2 pt-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-surface-500" />
                    <input
                      value={sourceSearch}
                      onChange={(e) => setSourceSearch(e.target.value)}
                      placeholder="Filter sources..."
                      className="input-field w-full text-xs pl-7 py-1.5"
                    />
                  </div>
                </div>
              )}

              <div
                {...getRootProps()}
                className={cn(
                  "flex-1 p-2 space-y-1 transition-colors",
                  isDragActive && "bg-primary-900/20 ring-1 ring-primary-500/30 ring-inset"
                )}
              >
                <input {...getInputProps()} />
                {isDragActive && (
                  <div className="flex flex-col items-center justify-center py-6 text-primary-400 text-xs">
                    <Upload className="w-6 h-6 mb-1" />
                    Drop files here
                  </div>
                )}

              {filteredSources.map((source) => (
                <button
                  key={source.id}
                  className={cn(
                    "sidebar-item group text-sm w-full",
                    selectedSource?.id === source.id && "sidebar-item-active"
                  )}
                  onClick={() => selectSource(source)}
                  role="listitem"
                >
                  <FileText className="w-4 h-4 shrink-0" />
                  <span className="truncate flex-1">{source.title}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSource(source.id);
                    }}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); deleteSource(source.id); } }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-400"
                    aria-label={`Delete ${source.title}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </span>
                </button>
              ))}

              {notebook.sources.length === 0 && !addSourceMode && (
                <div className="text-center py-8 px-3">
                  <Upload className="w-8 h-8 text-surface-600 mx-auto mb-2" />
                  <p className="text-xs text-surface-500">
                    Add sources or drop files here
                  </p>
                </div>
              )}

              {sourceSearch && filteredSources.length === 0 && notebook.sources.length > 0 && (
                <p className="text-xs text-surface-500 text-center py-4">
                  No sources match &ldquo;{sourceSearch}&rdquo;
                </p>
              )}
              </div>
            </div>
          )}

          {/* Add source section */}
          <div className="p-2 border-t border-surface-800">
            {addSourceMode ? (
              <div className="space-y-2">
                <input
                  placeholder="Title (optional)"
                  value={newSourceTitle}
                  onChange={(e) => setNewSourceTitle(e.target.value)}
                  className="input-field w-full text-sm"
                />
                {addSourceMode === "url" ? (
                  <input
                    placeholder="https://..."
                    value={newSourceUrl}
                    onChange={(e) => setNewSourceUrl(e.target.value)}
                    className="input-field w-full text-sm"
                  />
                ) : (
                  <textarea
                    placeholder="Paste or type your content..."
                    value={newSourceContent}
                    onChange={(e) => setNewSourceContent(e.target.value)}
                    rows={4}
                    className="input-field w-full text-sm resize-none"
                  />
                )}
                <div className="flex gap-1">
                  <button
                    onClick={addSource}
                    disabled={addingSource}
                    className="btn-primary text-xs flex-1 py-1.5"
                  >
                    {addingSource ? (
                      <Loader2 className="w-3 h-3 animate-spin mx-auto" />
                    ) : (
                      "Add"
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setAddSourceMode(null);
                      setNewSourceTitle("");
                      setNewSourceContent("");
                      setNewSourceUrl("");
                    }}
                    className="btn-ghost text-xs py-1.5"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-1">
                <button
                  onClick={() => setAddSourceMode("text")}
                  className="btn-ghost text-xs flex-1 flex items-center justify-center gap-1.5"
                >
                  <Type className="w-3 h-3" />
                  Text
                </button>
                <button
                  onClick={() => setAddSourceMode("url")}
                  className="btn-ghost text-xs flex-1 flex items-center justify-center gap-1.5"
                >
                  <Link className="w-3 h-3" />
                  URL
                </button>
                <label className="btn-ghost text-xs flex-1 flex items-center justify-center gap-1.5 cursor-pointer">
                  <Upload className="w-3 h-3" />
                  File
                  <input
                    type="file"
                    className="hidden"
                    accept=".txt,.md,.csv,.json"
                    multiple
                    onChange={(e) => {
                      if (e.target.files) handleFileDrop(Array.from(e.target.files));
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            )}
          </div>
        </aside>

        {/* CENTER: Chat / Source viewer / Note viewer */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedSource ? (
            /* Source viewer / editor */
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-surface-800">
                <div className="flex-1 min-w-0">
                  {editingSource ? (
                    <input
                      value={editSourceTitle}
                      onChange={(e) => setEditSourceTitle(e.target.value)}
                      className="input-field font-medium text-sm w-full"
                      placeholder="Source title"
                    />
                  ) : (
                    <>
                      <h2 className="font-medium text-surface-100">
                        {selectedSource.title}
                      </h2>
                      <div className="flex items-center gap-3 text-xs text-surface-500 mt-0.5">
                        <span>{selectedSource.type}</span>
                        {selectedSource.content && (
                          <span>
                            {selectedSource.content.split(/\s+/).filter(Boolean).length}{" "}
                            words
                          </span>
                        )}
                        {selectedSource.fileSize && (
                          <span>{formatFileSize(selectedSource.fileSize)}</span>
                        )}
                        <span>{formatDate(selectedSource.createdAt)}</span>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-2">
                  {editingSource ? (
                    <>
                      <button
                        onClick={saveSource}
                        disabled={savingSource}
                        className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5"
                      >
                        {savingSource ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Save className="w-3 h-3" />
                        )}
                        Save
                      </button>
                      <button
                        onClick={() => setEditingSource(false)}
                        className="btn-ghost p-1"
                        aria-label="Cancel editing"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      {!loadingSource && selectedSource.content !== undefined && (
                        <button
                          onClick={startEditingSource}
                          className="btn-ghost p-1"
                          title="Edit source"
                          aria-label="Edit source"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                      {selectedSource.content && (
                        <button
                          onClick={() =>
                            copyToClipboard(selectedSource.content || "")
                          }
                          className="btn-ghost p-1"
                          title="Copy to clipboard"
                        >
                          {copied ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => { setSelectedSource(null); setEditingSource(false); }}
                        className="btn-ghost p-1"
                        aria-label="Close source viewer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {loadingSource ? (
                  <div className="space-y-3 animate-pulse">
                    <div className="h-4 bg-surface-700 rounded w-full" />
                    <div className="h-4 bg-surface-700 rounded w-11/12" />
                    <div className="h-4 bg-surface-700 rounded w-4/5" />
                    <div className="h-4 bg-surface-700 rounded w-full" />
                    <div className="h-4 bg-surface-700 rounded w-3/4" />
                    <div className="h-4 bg-surface-700 rounded w-5/6" />
                  </div>
                ) : editingSource ? (
                  <textarea
                    value={editSourceContent}
                    onChange={(e) => setEditSourceContent(e.target.value)}
                    className="w-full h-full bg-transparent text-sm text-surface-300 resize-none focus:outline-none font-mono"
                    placeholder="Source content..."
                  />
                ) : (
                  <div className="prose-chat max-w-none whitespace-pre-wrap text-sm text-surface-300">
                    {selectedSource.content || "No content available"}
                  </div>
                )}
              </div>
            </div>
          ) : selectedNote ? (
            /* Note viewer / editor */
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-surface-800">
                <div className="flex-1 min-w-0">
                  {editingNote ? (
                    <input
                      value={editNoteTitle}
                      onChange={(e) => setEditNoteTitle(e.target.value)}
                      className="input-field font-medium text-sm w-full"
                      placeholder="Note title"
                    />
                  ) : (
                    <>
                      <h2 className="font-medium text-surface-100">
                        {selectedNote.title}
                      </h2>
                      <span className="text-xs text-surface-500">
                        {selectedNote.type} &middot;{" "}
                        {formatDate(selectedNote.updatedAt)}
                      </span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-2">
                  {editingNote ? (
                    <>
                      <button
                        onClick={saveNote}
                        disabled={savingNote}
                        className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5"
                      >
                        {savingNote ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Save className="w-3 h-3" />
                        )}
                        Save
                      </button>
                      <button
                        onClick={() => setEditingNote(false)}
                        className="btn-ghost p-1"
                        aria-label="Cancel editing"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={startEditingNote}
                        className="btn-ghost p-1"
                        title="Edit note"
                        aria-label="Edit note"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => copyToClipboard(selectedNote.content)}
                        className="btn-ghost p-1"
                        title="Copy to clipboard"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedNote(null);
                          setEditingNote(false);
                        }}
                        className="btn-ghost p-1"
                        aria-label="Close note viewer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {editingNote ? (
                  <textarea
                    value={editNoteContent}
                    onChange={(e) => setEditNoteContent(e.target.value)}
                    className="w-full h-full bg-transparent text-sm text-surface-300 resize-none focus:outline-none font-mono"
                    placeholder="Write your note content here (supports Markdown)..."
                  />
                ) : (
                  <div className="prose-chat max-w-none text-sm text-surface-300">
                    <ReactMarkdown>{selectedNote.content}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Chat */
            <div className="flex-1 flex flex-col">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {notebook.messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <Sparkles className="w-12 h-12 text-primary-400/30 mb-4" />
                    <h3 className="text-lg font-medium text-surface-300 mb-2">
                      Start a conversation
                    </h3>
                    <p className="text-sm text-surface-500 max-w-sm">
                      Ask questions about your sources. Add some sources first,
                      then ask me anything about them.
                    </p>
                    {notebook.sources.length > 0 && (
                      <div className="mt-6 flex flex-wrap gap-2 max-w-md">
                        {[
                          "Summarize my sources",
                          "What are the key themes?",
                          "What are the main arguments?",
                        ].map((suggestion) => (
                          <button
                            key={suggestion}
                            onClick={() => {
                              setChatInput(suggestion);
                            }}
                            className="btn-secondary text-xs"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {notebook.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex",
                      msg.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                        msg.role === "user"
                          ? "bg-primary-600 text-white"
                          : "bg-surface-800 text-surface-200"
                      )}
                    >
                      {msg.role === "assistant" ? (
                        <div className="prose-chat">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                ))}

                {sendingMessage && (
                  <div className="flex justify-start">
                    <div className="bg-surface-800 rounded-2xl px-4 py-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-surface-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <div className="w-2 h-2 bg-surface-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <div className="w-2 h-2 bg-surface-500 rounded-full animate-bounce" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-surface-800">
                <div className="flex gap-2">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && !e.shiftKey && sendMessage()
                    }
                    placeholder={
                      notebook.sources.length > 0
                        ? "Ask about your sources..."
                        : "Add sources first, then ask questions..."
                    }
                    className="input-field flex-1"
                    disabled={sendingMessage}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!chatInput.trim() || sendingMessage}
                    className="btn-primary px-3"
                    aria-label="Send message"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Notes / Studio panel */}
        <aside
          className={cn(
            "w-80 border-l border-surface-800 flex flex-col shrink-0 bg-surface-950",
            "max-lg:fixed max-lg:inset-y-0 max-lg:right-0 max-lg:z-40 max-lg:pt-14 max-lg:transition-transform max-lg:duration-200",
            showRightPanel ? "max-lg:translate-x-0" : "max-lg:translate-x-full"
          )}
          role="complementary"
          aria-label="Studio panel"
        >
          {/* Generate buttons */}
          <div className="p-3 border-b border-surface-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-surface-300">
                Studio
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {NOTE_TYPES.map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  onClick={() => generateNote(type)}
                  disabled={
                    generatingNote !== null || notebook.sources.length === 0
                  }
                  className="btn-ghost text-xs flex items-center gap-1.5 justify-start"
                >
                  {generatingNote === type ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Icon className="w-3 h-3" />
                  )}
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes list */}
          <div className="p-3 border-b border-surface-800 flex items-center justify-between">
            <button
              onClick={() => setNotesExpanded(!notesExpanded)}
              className="flex items-center gap-2 text-sm font-medium text-surface-300"
              aria-expanded={notesExpanded}
              aria-controls="notes-list"
            >
              {notesExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              Notes ({notebook.notes.length})
            </button>
            <button
              onClick={createNote}
              className="btn-ghost p-1"
              title="New note"
            >
              <PenLine className="w-3.5 h-3.5" />
            </button>
          </div>

          {notesExpanded && (
            <div id="notes-list" className="flex-1 overflow-y-auto flex flex-col" role="list">
              {notebook.notes.length > 3 && (
                <div className="px-2 pt-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-surface-500" />
                    <input
                      value={noteSearch}
                      onChange={(e) => setNoteSearch(e.target.value)}
                      placeholder="Filter notes..."
                      className="input-field w-full text-xs pl-7 py-1.5"
                    />
                  </div>
                </div>
              )}
              <div className="p-2 space-y-1">
              {filteredNotes.map((note) => (
                <div
                  key={note.id}
                  className={cn(
                    "sidebar-item group text-sm",
                    selectedNote?.id === note.id && "sidebar-item-active"
                  )}
                  onClick={() => {
                    setSelectedNote(note);
                    setSelectedSource(null);
                  }}
                >
                  <BookOpen className="w-4 h-4 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="truncate block">{note.title}</span>
                    <span className="text-xs text-surface-500">
                      {note.type}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNote(note.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {notebook.notes.length === 0 && (
                <div className="text-center py-8 px-3">
                  <BookOpen className="w-8 h-8 text-surface-600 mx-auto mb-2" />
                  <p className="text-xs text-surface-500">
                    Generate notes from your sources using the Studio buttons
                    above
                  </p>
                </div>
              )}

              {noteSearch && filteredNotes.length === 0 && notebook.notes.length > 0 && (
                <p className="text-xs text-surface-500 text-center py-4">
                  No notes match &ldquo;{noteSearch}&rdquo;
                </p>
              )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
