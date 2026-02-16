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

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
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
