import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const sources = await prisma.source.findMany({
    where: { notebookId: params.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(sources);
}

const MAX_SOURCE_LENGTH = 200_000; // ~50K tokens

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = await req.json();

  if (!body.content || typeof body.content !== "string" || !body.content.trim()) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  if (body.content.length > MAX_SOURCE_LENGTH) {
    return NextResponse.json(
      { error: `Source content exceeds maximum length of ${MAX_SOURCE_LENGTH} characters. Please split into smaller sources.` },
      { status: 400 }
    );
  }

  const source = await prisma.source.create({
    data: {
      notebookId: params.id,
      title: body.title,
      content: body.content,
      type: body.type || "TEXT",
      fileName: body.fileName,
      fileSize: body.fileSize,
    },
  });

  // Update notebook's updatedAt
  await prisma.notebook.update({
    where: { id: params.id },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json(source, { status: 201 });
}
