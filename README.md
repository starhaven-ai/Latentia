# Latentia

Your intelligent AI canvas for generating images and videos with state-of-the-art AI models.

## Overview

Latentia is a next-generation generative AI web platform that provides a unified interface for multiple AI image and video generation models. Unlike existing tools, Latentia introduces a project-centric organizational structure that enables teams to collaborate effectively on creative work.

## Features Implemented

### Phase 1: Foundation ✅

- ✅ Next.js 14 with TypeScript and App Router
- ✅ Tailwind CSS with custom dark theme
- ✅ Supabase integration (client and server)
- ✅ Prisma ORM with PostgreSQL schema
- ✅ shadcn/ui component library
- ✅ Authentication pages (login, signup)
- ✅ Protected routes middleware

### Phase 2: Project Management ✅

- ✅ Project dashboard with grid layout
- ✅ New project creation dialog
- ✅ Project cards with metadata
- ✅ Session management system
- ✅ Session sidebar with filtering

### Phase 3: Generation Interface ✅

- ✅ Chat-based generation UI
- ✅ Generation gallery with grid layout
- ✅ Chat input with parameter controls
- ✅ Model picker with pinning capability
- ✅ Parameter controls (aspect ratio, resolution, outputs)
- ✅ Image/Video mode toggle
- ✅ Hover overlay with action buttons (download, star, delete, reuse)
- ✅ Reuse parameters functionality

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes (serverless)
- **Database**: Supabase (PostgreSQL + Prisma ORM)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **Real-time**: Supabase Realtime
- **State Management**: Zustand (to be implemented)
- **Canvas**: React Flow (for node interface - to be implemented)

## Getting Started

### Prerequisites

- Node.js 18+ (preferably 20+)
- npm or pnpm
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd latentia
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Then edit `.env.local` with your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=your-database-url
```

4. Set up the database:
```bash
npm run prisma:push
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
latentia/
├── app/                      # Next.js app directory
│   ├── (auth)/              # Authentication pages
│   │   ├── login/
│   │   └── signup/
│   ├── projects/            # Projects pages
│   │   ├── [id]/           # Individual project page
│   │   └── page.tsx        # Projects dashboard
│   ├── auth/
│   │   └── callback/       # OAuth callback handler
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── ui/                  # shadcn/ui components
│   ├── projects/            # Project-related components
│   ├── sessions/            # Session-related components
│   └── generation/          # Generation interface components
├── lib/
│   ├── supabase/           # Supabase client configuration
│   └── utils.ts            # Utility functions
├── types/                   # TypeScript type definitions
├── prisma/
│   └── schema.prisma       # Database schema
└── middleware.ts           # Route protection middleware
```

## Database Schema

The database includes the following main tables:

- **profiles**: User profiles
- **projects**: Top-level project containers
- **project_members**: Collaboration/sharing
- **sessions**: Individual workstreams within projects
- **generations**: Generation requests
- **outputs**: Generated images/videos
- **models**: AI model configurations
- **user_model_pins**: User's pinned models
- **workflows**: Node-based workflows (future)

## Next Steps (To Be Implemented)

### Phase 4: Model Integrations

- [ ] Implement model adapter architecture
- [ ] Integrate Flux 1.1 Pro via Replicate/BFL API
- [ ] Integrate Seedream 4.0
- [ ] Integrate Nano Banana (Minimax)
- [ ] Integrate Minimax Video
- [ ] Create generation queue system
- [ ] Implement real-time generation updates

### Phase 5: Advanced Features

- [ ] Real-time collaboration with multiplayer cursors
- [ ] Node-based interface with React Flow
- [ ] Image starring/favoriting
- [ ] Generation history search
- [ ] Batch download
- [ ] Metadata panel

### Phase 6: Polish & Deployment

- [ ] Performance optimization
- [ ] Testing (unit, integration, E2E)
- [ ] Error tracking (Sentry)
- [ ] Analytics (Posthog)
- [ ] Deploy to Vercel
- [ ] Custom domain setup

## Contributing

This is a private project currently in active development.

## License

Proprietary - All rights reserved

## Documentation

For more details, see:
- [Product Requirements Document](./PRD.md)
- [Technical Architecture](./ARCHITECTURE.md)

---

Built with ❤️ using Next.js and Supabase

