import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const notes = await prisma.note.findMany({
    where: { notebookId: params.id },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(notes);
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = await req.json();

  // If generating a note type (summary, study guide, etc), build it from sources
  if (body.type && body.type !== "NOTE") {
    const sources = await prisma.source.findMany({
      where: { notebookId: params.id },
      select: { title: true, content: true },
    });

    if (sources.length === 0) {
      return NextResponse.json(
        { error: "No sources available to generate from" },
        { status: 400 }
      );
    }

    let content = "";
    let title = "";

    switch (body.type) {
      case "SUMMARY":
        title = "Summary";
        content = generateSummary(sources);
        break;
      case "STUDY_GUIDE":
        title = "Study Guide";
        content = generateStudyGuide(sources);
        break;
      case "FAQ":
        title = "FAQ";
        content = generateFAQ(sources);
        break;
      case "BRIEFING":
        title = "Briefing Doc";
        content = generateBriefing(sources);
        break;
      case "TIMELINE":
        title = "Timeline";
        content = generateTimeline(sources);
        break;
      case "PODCAST_SCRIPT":
        title = "Podcast Script";
        content = generatePodcastScript(sources);
        break;
      default:
        title = body.title || "Note";
        content = body.content || "";
    }

    const note = await prisma.note.create({
      data: {
        notebookId: params.id,
        title,
        content,
        type: body.type,
      },
    });
    return NextResponse.json(note, { status: 201 });
  }

  const note = await prisma.note.create({
    data: {
      notebookId: params.id,
      title: body.title || "Untitled note",
      content: body.content || "",
      type: "NOTE",
    },
  });
  return NextResponse.json(note, { status: 201 });
}

function generateSummary(
  sources: { title: string; content: string }[]
): string {
  const sections = sources.map((s) => {
    const sentences = s.content
      .split(/[.!?]+/)
      .filter((sentence) => sentence.trim().length > 10);
    const keySentences = sentences.slice(0, 5).map((s) => s.trim());
    return `## ${s.title}\n\n${keySentences.join(". ")}.`;
  });

  return `# Summary\n\n${sections.join("\n\n---\n\n")}\n\n---\n*Generated from ${sources.length} source(s). For AI-enhanced summaries, configure your OpenAI API key.*`;
}

function generateStudyGuide(
  sources: { title: string; content: string }[]
): string {
  const allContent = sources.map((s) => s.content).join(" ");
  const sentences = allContent
    .split(/[.!?]+/)
    .filter((s) => s.trim().length > 20);
  const keyPoints = sentences.slice(0, 10).map((s, i) => `${i + 1}. ${s.trim()}`);

  const questions = sentences.slice(0, 5).map((s) => {
    const trimmed = s.trim();
    return `- What is the significance of: "${trimmed.slice(0, 80)}..."?`;
  });

  return `# Study Guide\n\n## Key Concepts\n\n${keyPoints.join("\n")}\n\n## Review Questions\n\n${questions.join("\n")}\n\n## Sources Referenced\n\n${sources.map((s) => `- ${s.title}`).join("\n")}\n\n---\n*Generated from ${sources.length} source(s). For AI-enhanced study guides, configure your OpenAI API key.*`;
}

function generateFAQ(
  sources: { title: string; content: string }[]
): string {
  const allContent = sources.map((s) => s.content).join(" ");
  const sentences = allContent
    .split(/[.!?]+/)
    .filter((s) => s.trim().length > 30);

  const faqs = sentences.slice(0, 7).map((s, i) => {
    const trimmed = s.trim();
    return `### Q${i + 1}: What about "${trimmed.slice(0, 50)}..."?\n\n${trimmed}.`;
  });

  return `# Frequently Asked Questions\n\n${faqs.join("\n\n")}\n\n---\n*Generated from ${sources.length} source(s). For AI-enhanced FAQs, configure your OpenAI API key.*`;
}

function generateBriefing(
  sources: { title: string; content: string }[]
): string {
  const sections = sources.map((s) => {
    const paragraphs = s.content.split("\n\n").filter((p) => p.trim());
    const preview = paragraphs.slice(0, 2).join("\n\n");
    return `## ${s.title}\n\n${preview}`;
  });

  return `# Briefing Document\n\n**Sources analyzed:** ${sources.length}\n\n${sections.join("\n\n---\n\n")}\n\n---\n*Generated from ${sources.length} source(s). For AI-enhanced briefings, configure your OpenAI API key.*`;
}

function generateTimeline(
  sources: { title: string; content: string }[]
): string {
  const events = sources.map((s, i) => {
    const firstLine = s.content.split("\n")[0].trim();
    return `- **Source ${i + 1}** - ${s.title}: ${firstLine.slice(0, 100)}...`;
  });

  return `# Timeline\n\n${events.join("\n")}\n\n---\n*Generated from ${sources.length} source(s). For AI-enhanced timelines with date extraction, configure your OpenAI API key.*`;
}

function generatePodcastScript(
  sources: { title: string; content: string }[]
): string {
  const topics = sources.map((s) => {
    const sentences = s.content
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 10);
    return {
      title: s.title,
      points: sentences.slice(0, 3).map((s) => s.trim()),
    };
  });

  let script = `# Podcast Script\n\n`;
  script += `**Host A:** Welcome to today's deep dive! We've got some fascinating material to cover.\n\n`;
  script += `**Host B:** That's right! We've been going through ${sources.length} source(s) and there's a lot to unpack.\n\n`;

  topics.forEach((topic, i) => {
    script += `---\n\n`;
    script += `**Host A:** Let's talk about "${topic.title}"\n\n`;
    topic.points.forEach((point, j) => {
      const host = j % 2 === 0 ? "Host B" : "Host A";
      script += `**${host}:** ${point}.\n\n`;
    });
  });

  script += `---\n\n`;
  script += `**Host A:** And that wraps up today's episode!\n\n`;
  script += `**Host B:** Thanks for listening, and don't forget to check out the source materials!\n\n`;
  script += `---\n*Generated from ${sources.length} source(s). For AI-enhanced podcast scripts, configure your OpenAI API key.*`;

  return script;
}
