# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js monorepo with shadcn/ui components managed in a shared package. The repository uses Turborepo for build orchestration and npm workspaces.

## Architecture

- **apps/web** - The main Next.js application (Next.js 16 with App Router)
- **packages/ui** - Shared UI component package containing shadcn/ui components (radix-nova style)
- **packages/eslint-config** - Shared ESLint configuration
- **packages/typescript-config** - Shared TypeScript configuration

The `web` app imports UI components from `@workspace/ui` (e.g., `import { Button } from "@workspace/ui/components/button"`). The `utils` function (`cn`) is imported from `@workspace/ui/lib/utils`.

## Commands

Root-level commands (run from repository root):
- `npm run build` - Build all packages via Turborepo
- `npm run dev` - Run development servers (web app with turbopack)
- `npm run lint` - Lint all packages
- `npm run format` - Format all packages with Prettier
- `npm run typecheck` - Type-check all packages

App-specific commands:
- `npm run dev` (in apps/web) - Run Next.js dev server with Turbopack
- `npm run build` (in apps/web) - Build the Next.js app

## Adding shadcn/ui Components

To add a new shadcn/ui component, run from the root:
```bash
cd apps/web && pnpm dlx shadcn@latest add component-name -c apps/web
```

This places the component in `packages/ui/src/components/` and registers it in `components.json` under `apps/web`.

## Package Aliases

The `web` app has these path aliases configured:
- `@/*` → `./` (local app files)
- `@workspace/ui/*` → `../../packages/ui/src/*` (shared UI package)
- `utils` → `@workspace/ui/lib/utils` (the `cn` helper)
- `ui` → `@workspace/ui/components` (shadcn components)

## Important Notes

- The web app's `tailwind.config.ts` extends the globals.css from `packages/ui/src/styles/globals.css` - do not create a separate tailwind.config in apps/web
- shadcn components use the radix-nova style variant
- Next.js is configured to transpile `@workspace/ui` package via `transpilePackages` in `apps/web/next.config.mjs`