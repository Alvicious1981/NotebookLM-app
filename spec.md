# NotebookLM App — Specification

## Overview

NotebookLM App is an AI-powered research and note-taking application that allows users to upload documents, ask questions about their content, and generate summaries, study guides, and audio overviews. It acts as a personalized AI research assistant grounded in user-provided sources.

## Goals

- Provide an intuitive interface for uploading and managing document sources.
- Enable AI-driven Q&A grounded exclusively in the user's uploaded content.
- Generate structured outputs such as summaries, FAQs, study guides, timelines, and briefing docs.
- Support audio overview generation (podcast-style) from source material.
- Ensure user data privacy — documents are only used within the user's session/workspace.

## Core Features

### 1. Notebook Management

- Users can create, rename, and delete notebooks.
- Each notebook acts as an isolated workspace with its own set of sources and conversations.

### 2. Source Upload & Ingestion

- Supported formats: PDF, TXT, Markdown, Google Docs links, web URLs, YouTube video links, and copy-pasted text.
- Sources are parsed, chunked, and indexed for retrieval-augmented generation (RAG).
- Maximum of 50 sources per notebook, up to 500,000 words each.

### 3. AI Chat (Grounded Q&A)

- Conversational interface for asking questions about uploaded sources.
- Responses include inline citations referencing specific sources and passages.
- Users can select specific sources to scope the conversation.
- Chat history is persisted per notebook.

### 4. Notebook Guide

- Auto-generated overview of all sources in a notebook.
- Suggested questions based on source content.
- One-click generation of:
  - **Summary** — concise overview of all sources.
  - **FAQ** — frequently asked questions derived from the content.
  - **Study Guide** — structured review material.
  - **Table of Contents** — organized outline.
  - **Timeline** — chronological events extracted from sources.
  - **Briefing Doc** — executive-style summary.

### 5. Audio Overview

- Generate a podcast-style audio discussion between two AI voices.
- The audio is based entirely on the notebook's source material.
- Users can customize the focus and length of the audio.

### 6. Notes

- Users can create, edit, and delete notes within a notebook.
- Notes can be saved from AI-generated content or written manually.
- Notes can be pinned to the Notebook Guide for quick access.
- Notes can be used as additional context in chat.

## Architecture

### Frontend

- **Framework**: React (with TypeScript)
- **State Management**: Zustand or Redux Toolkit
- **Styling**: Tailwind CSS
- **Routing**: React Router
- **Rich Text Editing**: TipTap or Slate.js

### Backend

- **Runtime**: Node.js with Express (or Next.js API routes)
- **Language**: TypeScript
- **Authentication**: OAuth 2.0 (Google, GitHub) + JWT sessions
- **File Processing**: pdf-parse, mammoth (DOCX), markdown-it
- **Queue System**: BullMQ (for async tasks like audio generation)

### AI / ML

- **LLM Provider**: OpenAI API (GPT-4) or Anthropic API (Claude)
- **Embeddings**: OpenAI text-embedding-3-small or sentence-transformers
- **Vector Store**: Pinecone, Weaviate, or pgvector (PostgreSQL extension)
- **RAG Pipeline**: LangChain or LlamaIndex
- **Text-to-Speech**: ElevenLabs API or Google Cloud TTS

### Database

- **Primary DB**: PostgreSQL
- **ORM**: Prisma
- **File Storage**: AWS S3 or Cloudflare R2
- **Cache**: Redis

### Infrastructure

- **Hosting**: Vercel (frontend) + Railway or AWS (backend)
- **CI/CD**: GitHub Actions
- **Monitoring**: Sentry (errors), Posthog (analytics)

## Data Model

### User

| Field       | Type     | Description              |
|-------------|----------|--------------------------|
| id          | UUID     | Primary key              |
| email       | string   | User email               |
| name        | string   | Display name             |
| avatar_url  | string   | Profile picture URL      |
| created_at  | datetime | Account creation date    |

### Notebook

| Field       | Type     | Description              |
|-------------|----------|--------------------------|
| id          | UUID     | Primary key              |
| user_id     | UUID     | Owner reference          |
| title       | string   | Notebook name            |
| created_at  | datetime | Creation timestamp       |
| updated_at  | datetime | Last modified timestamp  |

### Source

| Field        | Type     | Description                        |
|--------------|----------|------------------------------------|
| id           | UUID     | Primary key                        |
| notebook_id  | UUID     | Parent notebook                    |
| type         | enum     | pdf, txt, md, url, youtube, paste  |
| title        | string   | Source title                       |
| content_raw  | text     | Original extracted text            |
| content_hash | string   | Deduplication hash                 |
| metadata     | json     | Author, page count, URL, etc.     |
| created_at   | datetime | Upload timestamp                   |

### Embedding Chunk

| Field       | Type      | Description                      |
|-------------|-----------|----------------------------------|
| id          | UUID      | Primary key                      |
| source_id   | UUID      | Parent source                    |
| chunk_index | integer   | Position in source               |
| text        | text      | Chunk content                    |
| embedding   | vector    | Vector representation            |
| metadata    | json      | Page number, section, etc.       |

### Chat Message

| Field        | Type     | Description                     |
|--------------|----------|---------------------------------|
| id           | UUID     | Primary key                     |
| notebook_id  | UUID     | Parent notebook                 |
| role         | enum     | user, assistant                 |
| content      | text     | Message body                    |
| citations    | json     | Source references                |
| created_at   | datetime | Timestamp                       |

### Note

| Field        | Type     | Description                     |
|--------------|----------|---------------------------------|
| id           | UUID     | Primary key                     |
| notebook_id  | UUID     | Parent notebook                 |
| title        | string   | Note title                      |
| content      | text     | Note body (rich text / markdown)|
| is_pinned    | boolean  | Pinned to guide                 |
| created_at   | datetime | Creation timestamp              |
| updated_at   | datetime | Last modified timestamp         |

## API Endpoints

### Auth

- `POST /api/auth/login` — Initiate OAuth flow
- `POST /api/auth/callback` — Handle OAuth callback
- `POST /api/auth/logout` — End session
- `GET  /api/auth/me` — Get current user

### Notebooks

- `GET    /api/notebooks` — List user notebooks
- `POST   /api/notebooks` — Create notebook
- `GET    /api/notebooks/:id` — Get notebook details
- `PATCH  /api/notebooks/:id` — Update notebook
- `DELETE /api/notebooks/:id` — Delete notebook

### Sources

- `GET    /api/notebooks/:id/sources` — List sources
- `POST   /api/notebooks/:id/sources` — Upload/add source
- `DELETE /api/notebooks/:id/sources/:sourceId` — Remove source

### Chat

- `GET  /api/notebooks/:id/chat` — Get chat history
- `POST /api/notebooks/:id/chat` — Send message (streaming response)

### Notes

- `GET    /api/notebooks/:id/notes` — List notes
- `POST   /api/notebooks/:id/notes` — Create note
- `PATCH  /api/notebooks/:id/notes/:noteId` — Update note
- `DELETE /api/notebooks/:id/notes/:noteId` — Delete note

### Generation

- `POST /api/notebooks/:id/generate/summary` — Generate summary
- `POST /api/notebooks/:id/generate/faq` — Generate FAQ
- `POST /api/notebooks/:id/generate/study-guide` — Generate study guide
- `POST /api/notebooks/:id/generate/audio` — Generate audio overview
- `GET  /api/notebooks/:id/generate/audio/status` — Check audio generation status

## Non-Functional Requirements

- **Performance**: Chat responses should begin streaming within 2 seconds. Source ingestion should complete within 30 seconds for documents under 100 pages.
- **Scalability**: Support up to 10,000 concurrent users. Vector store should handle millions of embedding chunks.
- **Security**: All data encrypted at rest and in transit. User documents are isolated per account. API rate limiting applied per user.
- **Accessibility**: WCAG 2.1 AA compliance. Keyboard navigation support. Screen reader compatibility.
- **Availability**: 99.9% uptime target. Graceful degradation if AI provider is unavailable.

## Milestones

1. **M1 — Project Setup**: Initialize repo, configure tooling (ESLint, Prettier, TypeScript), set up CI/CD.
2. **M2 — Auth & Notebooks**: Implement authentication, notebook CRUD, and basic UI shell.
3. **M3 — Source Ingestion**: File upload, parsing, chunking, and embedding pipeline.
4. **M4 — AI Chat**: RAG-powered conversational interface with citations.
5. **M5 — Notebook Guide & Generation**: Auto-generated summaries, FAQs, study guides, and other outputs.
6. **M6 — Notes**: Note creation, editing, and integration with chat context.
7. **M7 — Audio Overview**: Text-to-speech podcast generation pipeline.
8. **M8 — Polish & Launch**: Performance optimization, accessibility audit, and production deployment.
