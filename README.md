# NotebookLM App

An AI-powered notebook application inspired by Google's NotebookLM. Upload sources, chat with your documents, and generate summaries, study guides, podcast scripts, and more.

## Features

- **Notebook Management** - Create and organize multiple notebooks
- **Source Upload** - Add text content and URLs as sources
- **AI Chat** - Ask questions about your sources and get AI-powered answers
- **Note Generation** - Auto-generate summaries, study guides, FAQs, briefing docs, timelines, and podcast scripts
- **Dark Theme** - Modern dark UI built with Tailwind CSS

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: SQLite via Prisma ORM
- **AI**: OpenAI API integration (optional)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Set up the database
npx prisma db push

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | SQLite database path (default: `file:./dev.db`) |
| `OPENAI_API_KEY` | OpenAI API key for AI features (optional) |

## Project Structure

```
src/
  app/
    api/
      notebooks/          # Notebook CRUD API
        [id]/
          chat/           # AI chat endpoint
          notes/          # Notes CRUD + generation
          sources/        # Sources CRUD
    notebook/[id]/        # Notebook page (3-panel layout)
    page.tsx              # Home page (notebook grid)
  lib/
    db.ts                 # Prisma client singleton
    utils.ts              # Utility functions
prisma/
  schema.prisma           # Database schema
```
