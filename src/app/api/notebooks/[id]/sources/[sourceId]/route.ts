import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: { id: string; sourceId: string } }
) {
  const source = await prisma.source.findUnique({
    where: { id: params.sourceId },
  });

  if (!source) {
    return NextResponse.json({ error: "Source not found" }, { status: 404 });
  }

  return NextResponse.json(source);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; sourceId: string } }
) {
  try {
    await prisma.source.delete({
      where: { id: params.sourceId },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete source" },
      { status: 500 }
    );
  }
}
