import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

/** Rough token estimator (~4 chars per token for English text). */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Truncate text to fit within a token budget, breaking at sentence
 * boundaries when possible.
 */
export function truncateToTokenBudget(
  text: string,
  maxTokens: number
): string {
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) return text;

  const truncated = text.slice(0, maxChars);
  const lastSentenceEnd = truncated.search(/[.!?][^.!?]*$/);
  if (lastSentenceEnd > maxChars * 0.7) {
    return truncated.slice(0, lastSentenceEnd + 1) + "\n[...truncated]";
  }
  const lastNewline = truncated.lastIndexOf("\n");
  if (lastNewline > maxChars * 0.7) {
    return truncated.slice(0, lastNewline) + "\n[...truncated]";
  }
  return truncated + "...[truncated]";
}

/**
 * Sliding window: returns the most recent messages that fit within
 * the token budget, always keeping the latest message.
 */
export function fitMessagesInBudget(
  messages: { role: string; content: string }[],
  maxTokens: number
): { role: string; content: string }[] {
  const result: { role: string; content: string }[] = [];
  let usedTokens = 0;

  for (let i = messages.length - 1; i >= 0; i--) {
    const msgTokens = estimateTokens(messages[i].content);
    if (usedTokens + msgTokens > maxTokens && result.length > 0) break;
    usedTokens += msgTokens;
    result.unshift(messages[i]);
  }
  return result;
}
