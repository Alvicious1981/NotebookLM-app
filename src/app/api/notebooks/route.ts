import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const notebooks = await prisma.notebook.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: { sources: true, notes: true },
      },
    },
  });
  return NextResponse.json(notebooks);
}

export async function POST(req: Request) {
  const body = await req.json();
  const notebook = await prisma.notebook.create({
    data: {
      title: body.title || "Untitled notebook",
      description: body.description,
      emoji: body.emoji || "📓",
    },
    include: {
      _count: {
        select: { sources: true, notes: true },
      },
    },
  });
  return NextResponse.json(notebook, { status: 201 });
}
