import { prisma } from "@/lib/db";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const notebook = await prisma.notebook.findUnique({
    where: { id: params.id },
    select: { title: true, description: true },
  });

  if (!notebook) {
    return { title: "Notebook not found" };
  }

  return {
    title: notebook.title,
    description: notebook.description || "AI-powered notebook",
  };
}

export default function NotebookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
