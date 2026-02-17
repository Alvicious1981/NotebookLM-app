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
} from "lucide-react";
import ReactMarkdown from "react-markdown";
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

  // UX: error toast + clipboard
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Auto-clear error after 5s
  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(t);
    }
  }, [error]);

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
      {/* Error toast */}
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

      {/* Header */}
      <header className="border-b border-surface-800 px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={() => router.push("/")} className="btn-ghost p-2">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-2xl">{notebook.emoji}</span>
        {isEditingTitle ? (
          <input
            autoFocus
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={updateTitle}
            onKeyDown={(e) => e.key === "Enter" && updateTitle()}
            className="input-field text-lg font-semibold flex-1 max-w-md"
          />
        ) : (
          <h1
            className="text-lg font-semibold text-surface-100 cursor-pointer hover:text-primary-400 transition-colors"
            onClick={() => setIsEditingTitle(true)}
          >
            {notebook.title}
          </h1>
        )}
      </header>

      {/* Main content: 3-column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: Sources panel */}
        <div className="w-72 border-r border-surface-800 flex flex-col shrink-0">
          <div className="p-3 border-b border-surface-800">
            <button
              onClick={() => setSourcesExpanded(!sourcesExpanded)}
              className="flex items-center gap-2 text-sm font-medium text-surface-300 w-full"
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
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {notebook.sources.map((source) => (
                <div
                  key={source.id}
                  className={cn(
                    "sidebar-item group text-sm",
                    selectedSource?.id === source.id && "sidebar-item-active"
                  )}
                  onClick={() => selectSource(source)}
                >
                  <FileText className="w-4 h-4 shrink-0" />
                  <span className="truncate flex-1">{source.title}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSource(source.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {notebook.sources.length === 0 && !addSourceMode && (
                <div className="text-center py-8 px-3">
                  <Upload className="w-8 h-8 text-surface-600 mx-auto mb-2" />
                  <p className="text-xs text-surface-500">
                    Add sources to get started
                  </p>
                </div>
              )}
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
              </div>
            )}
          </div>
        </div>

        {/* CENTER: Chat / Source viewer / Note viewer */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedSource ? (
            /* Source viewer */
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-surface-800">
                <div>
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
                </div>
                <div className="flex items-center gap-1">
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
                    onClick={() => setSelectedSource(null)}
                    className="btn-ghost p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {loadingSource ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
                  </div>
                ) : (
                  <div className="prose-chat max-w-none whitespace-pre-wrap text-sm text-surface-300">
                    {selectedSource.content || "No content available"}
                  </div>
                )}
              </div>
            </div>
          ) : selectedNote ? (
            /* Note viewer */
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-surface-800">
                <div>
                  <h2 className="font-medium text-surface-100">
                    {selectedNote.title}
                  </h2>
                  <span className="text-xs text-surface-500">
                    {selectedNote.type} &middot;{" "}
                    {formatDate(selectedNote.updatedAt)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
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
                    onClick={() => setSelectedNote(null)}
                    className="btn-ghost p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="prose-chat max-w-none text-sm text-surface-300">
                  <ReactMarkdown>{selectedNote.content}</ReactMarkdown>
                </div>
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
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Notes / Studio panel */}
        <div className="w-80 border-l border-surface-800 flex flex-col shrink-0">
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
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {notebook.notes.map((note) => (
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
