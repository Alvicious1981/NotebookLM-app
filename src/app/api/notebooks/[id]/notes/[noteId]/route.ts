import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: { id: string; noteId: string } }
) {
  const note = await prisma.note.findUnique({
    where: { id: params.noteId },
  });

  if (!note) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  return NextResponse.json(note);
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; noteId: string } }
) {
  const body = await req.json();
  const note = await prisma.note.update({
    where: { id: params.noteId },
    data: {
      title: body.title,
      content: body.content,
    },
  });
  return NextResponse.json(note);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; noteId: string } }
) {
  await prisma.note.delete({
    where: { id: params.noteId },
  });
  return NextResponse.json({ success: true });
}
