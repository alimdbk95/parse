# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Backend (Express + Prisma)
```bash
cd backend
npm install              # Install dependencies
npm run dev              # Start dev server with hot reload (tsx watch)
npm run build            # Compile TypeScript to dist/
npm run start            # Run production build
npm run db:push          # Push schema changes to SQLite database
npm run db:generate      # Generate Prisma client
npm run db:studio        # Open Prisma Studio GUI
```

### Frontend (Next.js 14)
```bash
cd frontend
npm install              # Install dependencies
npm run dev              # Start Next.js dev server (localhost:3000)
npm run build            # Production build
npm run start            # Run production server
npm run lint             # Run ESLint
```

### Running Both Services
Start backend first (port 3001), then frontend (port 3000). Backend must be running for API calls.

## Architecture Overview

### Monorepo Structure
This is a **full-stack TypeScript monorepo** with separate `backend/` and `frontend/` directories, each with their own `package.json` and dependencies.

### Backend Architecture
- **Express.js** REST API with **Socket.io** for real-time features
- **Prisma ORM** with **SQLite** database (file: `backend/prisma/dev.db`)
- **JWT authentication** stored in localStorage on frontend
- Entry point: `backend/src/index.ts`

**Key Services:**
- `aiService.ts` - Mock AI service that simulates document analysis responses (returns sample chart data, not connected to real AI)
- `documentService.ts` - Handles file upload parsing (PDF, CSV, Excel)
- `chartService.ts` - Chart configuration and data formatting

**Route Structure:**
- `/api/auth/*` - Authentication (register, login, me)
- `/api/documents/*` - Document CRUD and upload
- `/api/analyses/*` - Analysis sessions and chat messages
- `/api/charts/*` - Chart CRUD
- `/api/workspaces/*` - Workspace and team member management
- `/api/settings/*` - User branding preferences

### Frontend Architecture
- **Next.js 14** with App Router
- **Zustand** for global state (`frontend/lib/store.ts`)
- **Tailwind CSS** with custom dark theme design system
- **Recharts** for chart visualization

**Route Structure:**
- `/login`, `/register` - Auth pages
- `/dashboard` - Main dashboard with quick actions
- `/dashboard/chat/[id]` - Analysis chat interface
- `/dashboard/documents` - Document library
- `/dashboard/compare` - Side-by-side document/chart comparison
- `/dashboard/settings` - User profile, branding, team management

**Key Frontend Files:**
- `lib/api.ts` - API client singleton wrapping all backend calls
- `lib/store.ts` - Zustand store with auth, workspace, analysis state
- `lib/socket.ts` - Socket.io client for real-time updates
- `components/ui/*` - Reusable UI components (Button, Input, Card, Modal, etc.)

### Database Schema (Prisma)
Core models: `User`, `Workspace`, `WorkspaceMember`, `Document`, `Analysis`, `AnalysisDocument`, `Message`, `Chart`, `Invitation`

- Users can belong to multiple Workspaces via WorkspaceMember (roles: admin, editor, viewer)
- Documents are uploaded and linked to Analyses via AnalysisDocument junction table
- Messages belong to Analyses (chat history)
- Charts can be standalone or linked to an Analysis

### Real-time Features
Socket.io rooms for workspaces and analyses:
- `workspace:{id}` - Document uploads, member changes
- `analysis:{id}` - New chat messages, document additions

## Environment Variables

Backend `.env`:
```
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret"
PORT=3001
FRONTEND_URL="http://localhost:3000"
```

Frontend `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

## Important Patterns

### Authentication Flow
1. Login/register returns JWT token
2. Token stored in localStorage (`parse_token`)
3. `api.ts` attaches token to all requests via Authorization header
4. `dashboard/layout.tsx` checks token on mount, redirects to `/login` if invalid

### Chart Data Format
Charts use Recharts. Data is stored as JSON strings in DB and parsed on frontend:
```typescript
{ type: 'bar' | 'line' | 'pie' | 'area', data: [...], colors: [...], config: {...} }
```

### File Uploads
- Handled via Multer middleware
- Files stored in `backend/uploads/`
- Supported types: PDF, CSV, Excel, images, JSON, text
