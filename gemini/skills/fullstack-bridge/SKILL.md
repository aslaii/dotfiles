---
name: fullstack-bridge
description: Manage and synchronize the bridge between NestJS backends and React/React Native frontends. Use when adding features that span both ends, syncing DTOs to TypeScript types, or generating API hooks.
---

# Fullstack Bridge

## Overview
This skill provides procedural guidance for keeping your NestJS backend and React/React Native frontends in sync. It ensures that data structures (DTOs), validation logic, and API hooks are consistent across the entire stack.

## Core Workflows

### 1. Synchronizing Types (DTO to TS)
When a backend DTO is created or updated:
1. Identify the relevant DTO file in the NestJS project.
2. Extract the properties and types, ensuring decorators like `@IsOptional()` are translated to `?` optional flags.
3. Update the corresponding interface in the frontend's `types/` directory.
4. Refer to [nestjs-patterns.md](references/nestjs-patterns.md) for extraction details.

### 2. Generating API Hooks (TanStack Query)
When a new controller or endpoint is added:
1. Map the endpoint path, HTTP method, and payload type.
2. Generate a TanStack Query hook following the pattern in [frontend-patterns.md](references/frontend-patterns.md).
3. Ensure the `queryKey` is consistent to allow for proper cache invalidation.

### 3. Validating the Bridge
Before considering a feature complete:
1. Verify that the frontend payload matches the backend DTO exactly.
2. Check that the `baseUrl` in React Native is correctly configured for the current environment (Simulator vs. Device).
3. Confirm that error responses from NestJS are handled gracefully by the frontend hooks.

## Capabilities

### NestJS Intelligence
- Analyzes `@Controller` and `@Body` decorators to understand API contracts.
- Suggests `class-validator` improvements for better type safety.

### Frontend Automation
- Scaffolds `useQuery` and `useMutation` hooks with proper typing.
- Suggests React Native specific optimizations for network requests.

## AI Agent Workflow (Plan Mode)
- **Read-Only Enforcement**: When in Plan Mode, agents MUST only use read-only tools (e.g., `read_file`, `list_directory`, `grep_search`).
- **No Modifications**: Do NOT attempt to use MCP tools or any editing tools to modify files while in Plan Mode.
- **Strategic Focus**: Use Plan Mode exclusively for codebase exploration and formulating implementation strategies.

## Resources
- [NestJS Patterns](references/nestjs-patterns.md): Best practices for DTOs and Controllers.
- [Frontend Patterns](references/frontend-patterns.md): Patterns for React Query and RN API clients.
