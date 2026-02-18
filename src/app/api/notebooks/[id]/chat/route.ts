import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { truncateToTokenBudget, fitMessagesInBudget } from "@/lib/utils";

// Token budget constants — keeps total prompt under ~13K tokens
const SOURCE_BUDGET = 8000;
const HISTORY_BUDGET = 3000;
const MAX_RESPONSE_TOKENS = 2000;

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const messages = await prisma.chatMessage.findMany({
    where: { notebookId: params.id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(messages);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.chatMessage.deleteMany({
      where: { notebookId: params.id },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to clear chat" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const userMessage = body.message;

  if (!userMessage || typeof userMessage !== "string" || !userMessage.trim()) {
    return NextResponse.json(
      { error: "Message is required" },
      { status: 400 }
    );
  }

  // Save the user message
  await prisma.chatMessage.create({
    data: {
      notebookId: params.id,
      role: "user",
      content: userMessage.trim(),
    },
  });

  // Get all sources for context
  const sources = await prisma.source.findMany({
    where: { notebookId: params.id },
    select: { title: true, content: true },
  });

  // Budget-aware source context: distribute budget equally across sources
  const perSourceBudget =
    sources.length > 0 ? Math.floor(SOURCE_BUDGET / sources.length) : 0;

  const sourceContext = sources
    .map((s) => {
      const truncated = truncateToTokenBudget(s.content, perSourceBudget - 20);
      return `--- Source: ${s.title} ---\n${truncated}`;
    })
    .join("\n\n");

  // Budget-aware history: fetch recent, then trim by token budget
  const history = await prisma.chatMessage.findMany({
    where: { notebookId: params.id },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  const fittedHistory = fitMessagesInBudget(
    history.map((m) => ({ role: m.role, content: m.content })),
    HISTORY_BUDGET
  );

  // Try to call OpenAI API, fallback to a structured response if not configured
  let assistantContent: string;

  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey && apiKey !== "sk-...") {
    try {
      const messages = [
        {
          role: "system" as const,
          content: `You are a helpful AI research assistant for NotebookLM. You help users understand, analyze, and learn from their uploaded sources. Answer questions based on the provided source material. If the answer isn't found in the sources, let the user know. Be concise but thorough.

Here are the user's sources:
${sourceContext || "No sources have been added yet."}`,
        },
        ...fittedHistory.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages,
            temperature: 0.7,
            max_tokens: MAX_RESPONSE_TOKENS,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        assistantContent = data.choices[0].message.content;
      } else {
        assistantContent = generateLocalResponse(userMessage, sources);
      }
    } catch {
      assistantContent = generateLocalResponse(userMessage, sources);
    }
  } else {
    assistantContent = generateLocalResponse(userMessage, sources);
  }

  // Save the assistant message
  const assistantMessage = await prisma.chatMessage.create({
    data: {
      notebookId: params.id,
      role: "assistant",
      content: assistantContent,
    },
  });

  return NextResponse.json(assistantMessage);
}

function generateLocalResponse(
  query: string,
  sources: { title: string; content: string }[]
): string {
  if (sources.length === 0) {
    return "No sources have been added to this notebook yet. Add some sources (text, documents, or URLs) and I'll be able to help you analyze and understand them.";
  }

  const queryLower = query.toLowerCase();
  const relevantSources = sources.filter(
    (s) =>
      s.content.toLowerCase().includes(queryLower) ||
      s.title.toLowerCase().includes(queryLower)
  );

  if (queryLower.includes("summary") || queryLower.includes("summarize")) {
    const summaries = sources
      .map((s) => {
        const sentences = s.content.split(/[.!?]+/).filter((s) => s.trim());
        const preview = sentences.slice(0, 3).join(". ").trim();
        return `**${s.title}**: ${preview}${sentences.length > 3 ? "..." : "."}`;
      })
      .join("\n\n");
    return `Here's a summary of your sources:\n\n${summaries}`;
  }

  if (relevantSources.length > 0) {
    const excerpts = relevantSources
      .map((s) => {
        const lines = s.content.split("\n");
        const matching = lines.filter((l) =>
          l.toLowerCase().includes(queryLower)
        );
        const excerpt = matching.slice(0, 3).join("\n");
        return `From **${s.title}**:\n> ${excerpt || lines.slice(0, 3).join("\n")}`;
      })
      .join("\n\n");
    return `Based on your sources, here's what I found:\n\n${excerpts}\n\n*To get AI-powered answers, configure your OpenAI API key in the .env file.*`;
  }

  return `I searched through your ${sources.length} source(s) but couldn't find specific information about "${query}". Try rephrasing your question or add more relevant sources.\n\n*For AI-powered answers, configure your OpenAI API key in the .env file.*`;
}
