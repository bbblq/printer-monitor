# Agent Guidelines for Printer Monitor

This document provides guidelines for agentic coding agents operating in this repository.

## Project Overview

- **Type**: Next.js 16 web application (Printer monitoring dashboard)
- **Stack**: Next.js 16, React 19, TypeScript, Tailwind CSS 4, better-sqlite3, SNMP
- **Path Alias**: `@/*` maps to `./src/*`

---

## Commands

### Development

```bash
npm run dev        # Start dev server
npm run build      # Production build
npm run start      # Start production server
```

### Linting

```bash
npm run lint       # Run ESLint
```

**No test framework is currently configured** - no `npm test` command available.

### MCP Server

```bash
npm run mcp        # Start MCP server (stdio)
```

The MCP server exposes printer data as tools and resources for AI assistants.

### Database

The project uses SQLite via `better-sqlite3`. Database file is created at runtime.

---

## Code Style Guidelines

### TypeScript

- **Strict mode enabled** (`strict: true` in tsconfig.json)
- Use explicit types for function parameters and return types
- Use TypeScript interfaces for data structures (e.g., `Printer`, `Supply`)
- Avoid `any` type - use `unknown` if type is truly uncertain

### Imports

- Use path alias `@/*` for internal imports: `import { something } from '@/lib/printerService'`
- Order imports logically:
  1. External libraries (React, Next.js)
  2. Internal imports (@/lib, @/components)
- Example:
  ```typescript
  import { NextResponse } from 'next/server';
  import { getAllPrinters } from '@/lib/printerService';
  import { initializeApp } from '@/lib/init';
  ```

### Naming Conventions

- **Files**: kebab-case for utilities (`printerService.ts`), PascalCase for components (`PrinterCard.tsx`)
- **Functions**: camelCase (`getAllPrinters`, `refreshAllPrinters`)
- **Types/Interfaces**: PascalCase (`Printer`, `PrinterStatus`, `Supply`)
- **Constants**: UPPER_SNAKE_CASE for compile-time constants (`INITIAL_PRINTERS`)
- **Database columns**: snake_case (`display_order`, `consumable_model`, `max_capacity`)

### React Components

- Use `'use client'` directive for client-side components
- Use function components with explicit prop interfaces
- Use named exports for components: `export function PrinterCard(...)`
- Component props should use explicit interfaces

Example:
```typescript
'use client';

import React from 'react';
import { Printer } from '@/lib/types';

interface PrinterCardProps {
    printer: Printer;
    onViewHistory: (printer: Printer) => void;
}

export function PrinterCard({ printer, onViewHistory }: PrinterCardProps) {
    // ...
}
```

### Error Handling

- Use try-catch blocks for async operations
- Always log errors with descriptive messages
- Return appropriate HTTP status codes in API routes
- Example:
  ```typescript
  try {
      addPrinter({ name, brand, model, ip, location });
      return NextResponse.json({ success: true });
  } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 });
  }
  ```

### Database Operations

- Use `better-sqlite3` with prepared statements
- Use transactions for multi-step operations
- Use named parameters with `@` prefix: `db.prepare('INSERT INTO ... VALUES (@name)')`
- Example with transaction:
  ```typescript
  const tx = db.transaction(() => {
      for (const supply of data.supplies) {
          updateSupply.run(p.id, supply.color, supply.level, supply.max, supply.isBinary ? 1 : 0);
      }
  });
  tx();
  ```

### CSS / Styling

- Use **Tailwind CSS v4** (configured in `tailwind.config.ts`)
- Use utility classes for all styling
- Common patterns:
  - Rounded corners: `rounded-xl`, `rounded-lg`
  - Spacing: `p-5`, `px-2`, `gap-2`, `space-y-1.5`
  - Colors: `bg-white`, `text-slate-500`, `border-red-200`
  - Typography: `font-bold`, `text-xl`, `text-sm`
  - Hover states: `hover:shadow-md`, `hover:border-slate-300`

### API Routes

- Use Next.js App Router (`src/app/api/*`)
- Return `NextResponse.json()` with appropriate status codes
- Validate request bodies before processing
- Example:
  ```typescript
  export async function POST(request: Request) {
      const body = await request.json();
      const { name, brand, model, ip, location } = body;

      if (!ip || !brand) {
          return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }
      // ...
  }
  ```

### Async Operations

- Use `async/await` for asynchronous operations
- Use `Promise.all` for parallel operations when appropriate
- Example:
  ```typescript
  const refreshPrinter = async (p: Printer) => {
      try {
          const data = await fetchPrinterStatus(p.ip);
          // ...
      } catch (e) {
          console.error(`Failed to refresh printer ${p.ip}:`, e);
      }
  };

  await Promise.all(batch.map(refreshPrinter));
  ```

### ESLint Configuration

- Uses `eslint-config-next` with TypeScript support
- Runs with `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Run `npm run lint` before committing

---

## Directory Structure

```
src/
├── app/                 # Next.js App Router pages
│   ├── api/            # API routes
│   ├── admin/         # Admin pages
│   └── history/      # History page
├── components/         # React components
└── lib/               # Utility functions and services
    ├── db.ts          # Database initialization
    ├── printerService.ts  # Printer CRUD operations
    ├── snmp.ts       # SNMP fetching
    └── notification.ts # Feishu notifications
```

---

## Common Patterns

### Conditional Classes

Use template literals with logical operators:
```typescript
className={`
    rounded-xl border p-5
    ${isOnline
        ? 'bg-white border-slate-200'
        : 'bg-red-50 border-red-200'
    }
`}
```

### Type Narrowing

Use explicit type guards and narrowing:
```typescript
const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
return row ? row.value : null;
```

### Database Column Access

Access database results with column names (snake_case):
```typescript
const printer = db.prepare('SELECT * FROM printers').get() as {
    id: number;
    display_order: number;
    consumable_model: string;
};
```
