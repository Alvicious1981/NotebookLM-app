import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const notebook = await prisma.notebook.findUnique({
    where: { id: params.id },
    include: {
      sources: { orderBy: { createdAt: "desc" } },
      messages: { orderBy: { createdAt: "asc" } },
      notes: { orderBy: { updatedAt: "desc" } },
      _count: { select: { sources: true } },
    },
  });

  if (!notebook) {
    return NextResponse.json({ error: "Notebook not found" }, { status: 404 });
  }

  return NextResponse.json(notebook);
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const notebook = await prisma.notebook.update({
    where: { id: params.id },
    data: {
      title: body.title,
      description: body.description,
      emoji: body.emoji,
    },
  });
  return NextResponse.json(notebook);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  await prisma.notebook.delete({
    where: { id: params.id },
  });
  return NextResponse.json({ success: true });
}
