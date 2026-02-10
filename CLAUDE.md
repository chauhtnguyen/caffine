# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AFFiNE is an open-source, all-in-one workspace combining documentation (like Notion), whiteboarding (like Miro), and real-time collaboration with a local-first architecture. It features both page and edgeless (canvas) modes with AI-powered capabilities.

## Architecture

### Monorepo Structure

- **packages/backend/**: NestJS server with GraphQL API and native Rust bindings
- **packages/frontend/**: React-based applications for web, desktop (Electron), and mobile (Capacitor)
- **packages/common/**: Shared utilities and infrastructure
- **blocksuite/**: Custom collaborative editor framework (LitElement-based)

### Tech Stack

- **Frontend**: React 19, TypeScript, Jotai (state), Vanilla Extract (styling)
- **Backend**: NestJS, Prisma, GraphQL, PostgreSQL, Redis
- **Editor**: BlockSuite with Y.js CRDTs for collaboration
- **Native**: Rust with NAPI-RS for performance-critical operations
- **Mobile**: Capacitor for iOS/Android
- **Desktop**: Electron

## Essential Commands

### Setup & Development

```bash
# Install dependencies
yarn install

# Start development server (web)
yarn dev

# Platform-specific development
yarn workspace @affine/electron dev     # Desktop development
yarn workspace @affine/server dev       # Backend development

# Use the custom CLI for various tasks
yarn affine dev    # Development server
yarn affine build  # Production build
yarn affine clean  # Clean build artifacts
```

### Testing

```bash
# Run all tests
yarn test

# Run specific test suites
yarn workspace @affine-test/affine-local e2e    # Local E2E tests
yarn workspace @affine-test/affine-cloud e2e    # Cloud E2E tests
yarn workspace @affine-test/affine-desktop e2e  # Desktop E2E tests
yarn workspace @blocksuite/blocks test          # BlockSuite tests

# Run unit tests with coverage
yarn test:coverage
```

### Code Quality

```bash
# Lint and format
yarn lint          # ESLint + Prettier
yarn typecheck     # TypeScript type checking

# Fix linting issues
yarn lint:fix
```

### Database

```bash
# Generate Prisma client
yarn workspace @affine/server prisma generate

# Run migrations
yarn workspace @affine/server prisma migrate dev

# Open Prisma Studio
yarn workspace @affine/server prisma studio
```

### Building

```bash
# Build all packages
yarn build

# Build specific platforms
yarn workspace @affine/electron build    # Desktop app
yarn workspace @affine/server build      # Backend server
yarn workspace @affine/web build         # Web app

# Bundle for distribution
yarn affine bundle
```

## Key Architectural Patterns

### BlockSuite Integration

BlockSuite is the core editor framework that powers AFFiNE's editing capabilities. It's a separate framework within the monorepo that:

- Uses LitElement for web components
- Implements CRDT-based collaborative editing via Y.js
- Provides extensible block-based architecture
- Handles both page and edgeless (canvas) modes

When working with editor functionality, check `blocksuite/` directory for the framework implementation.

### Local-First Architecture

- Data is stored locally using IndexedDB and SQLite
- Optional cloud sync through the backend GraphQL API
- Y.js CRDTs ensure conflict-free collaboration
- Workspace data can be exported/imported

### Module Organization

- **@affine/core**: Main application logic and routing
- **@affine/component**: Reusable UI components
- **@affine/i18n**: Internationalization resources
- **@affine/native**: Rust native bindings
- **@blocksuite/blocks**: Editor block implementations
- **@blocksuite/store**: CRDT document store

### AI Integration

AI features are integrated through multiple providers (OpenAI, Anthropic, etc.) with:

- Server-side API in `packages/backend/server/src/modules/ai/`
- Frontend integration in `packages/frontend/core/src/modules/ai/`
- Support for embeddings, chat, and content generation

## Development Guidelines

### Working with the Editor

When modifying editor functionality:

1. Check `blocksuite/blocks/` for block implementations
2. Look at `blocksuite/framework/` for core editor logic
3. Test changes with `yarn workspace @blocksuite/blocks test`

### Adding Features

1. Frontend features go in `packages/frontend/core/`
2. Shared components in `packages/frontend/component/`
3. Backend APIs in `packages/backend/server/`
4. Use dependency injection patterns in backend
5. Follow atomic design principles in frontend

### Performance Considerations

- Native Rust modules handle performance-critical operations
- Use React.memo and useMemo for expensive computations
- BlockSuite handles large documents efficiently with virtualization
- Database queries should use proper indexing

### Testing Requirements

- Write unit tests for utilities and components
- Add E2E tests for user-facing features
- Test across different deployment scenarios (local, cloud, desktop)
- Ensure mobile compatibility for web features
