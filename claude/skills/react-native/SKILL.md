---
name: react-native
description: Expert guidance for Expo Router React Native apps. Use when building screens, hooks,
  forms, state management, localization, or tests in a React Native project.
---

# React Native Skill

## Overview

**Tech stack:**
- **Routing**: Expo Router v4 (file-based, typed params)
- **Data fetching**: TanStack Query v5 (`useQuery`, `useMutation`, `useSuspenseQuery`)
- **State**: Zustand v5 + Immer middleware + `useShallow`
- **Forms**: `react-hook-form` + Zod resolver
- **UI**: React Native Paper v5
- **i18n**: `i18next` + `react-i18next` + Expo locale detection
- **Testing**: `jest-expo` preset, `@testing-library/react-native`
- **Language**: TypeScript strict mode throughout

---

## Core Workflows

### 1. New Screen
1. Create `app/(stack)/screen-name.tsx` (or within the appropriate group).
2. Add a `_layout.tsx` if the screen needs its own stack/tab configuration.
3. Type route params using `useLocalSearchParams<{ id: string }>()`.
4. Extract all data-fetching and side-effect logic into a co-located `useScreenNameScreen.ts` hook.
5. Keep the screen component lean — layout and composition only.
6. See [expo-router-patterns.md](references/expo-router-patterns.md).

### 2. Data Fetching
1. Define a Zod schema for the API response shape.
2. Derive the TypeScript type with `z.infer<typeof Schema>`.
3. Add a query key to the centralised `queryKeys` factory.
4. Create a `use<Resource>Query.ts` hook using `useQuery` or `useSuspenseQuery`.
5. Bind the hook result to the component — show loading/error states.
6. See [tanstack-query-patterns.md](references/tanstack-query-patterns.md).

### 3. Form
1. Define the form schema with `z.object(...)`.
2. Initialise `useForm` with `zodResolver(schema)` and typed `defaultValues`.
3. Wrap each input in `<Controller>` and use RN Paper input components.
4. Add cross-field refinements in `.superRefine()` or `.refine()`.
5. Handle submission with `handleSubmit` — map errors to user-friendly messages.
6. See [zod-forms-patterns.md](references/zod-forms-patterns.md).

### 4. Zustand Store Slice
1. Define the state interface and the slice actions interface.
2. Create the slice with `create<S>()(immer(...))`.
3. Co-locate selectors as named exports beside the store file.
4. Use `useShallow` when subscribing to multiple fields to prevent extra re-renders.
5. For sensitive persistent state, use `persist` with `expo-secure-store`.
6. See [zustand-immer-patterns.md](references/zustand-immer-patterns.md).

### 5. Localization
1. Add the new key to all locale JSON files under `src/i18n/locales/`.
2. Use the `useTranslation('namespace')` hook in the component.
3. Apply `t('key')` for simple strings, `t('key', { count })` for plurals.
4. Expo locale detection runs at app boot — no manual setup needed.
5. See [i18n-patterns.md](references/i18n-patterns.md).

### 6. Tests
1. Co-locate test files next to the module: `useHook.test.ts`, `Component.test.tsx`.
2. Use `renderHook` with a `QueryClientWrapper` for hooks that touch TanStack Query.
3. Wrap Zustand-dependent renders in a `StoreProvider` or call `useStore.setState` directly.
4. Use `waitFor` for async assertions; `act` for state-triggering interactions.
5. Prefer role/label queries over `testID` for accessibility coverage.
6. See [testing-patterns.md](references/testing-patterns.md).

---

## Capabilities

- Scaffold complete screen files with routing, hook, and test stubs.
- Generate TanStack Query hooks from an API endpoint description or Zod schema.
- Design Zustand slices with full TypeScript, Immer, and `persist` support.
- Build accessible forms with inline Zod validation and RN Paper components.
- Add i18n keys across all locale files consistently.
- Produce `jest-expo` test suites for hooks and components.
- Enforce SOLID, DRY, and conventional commit guidelines in all generated code.

---

## Resources

- [Expo Router Patterns](references/expo-router-patterns.md)
- [TanStack Query Patterns](references/tanstack-query-patterns.md)
- [Zustand + Immer Patterns](references/zustand-immer-patterns.md)
- [Zod Forms Patterns](references/zod-forms-patterns.md)
- [i18n Patterns](references/i18n-patterns.md)
- [React Native Paper Patterns](references/rn-paper-patterns.md)
- [Component Architecture](references/component-architecture.md)
- [Testing Patterns](references/testing-patterns.md)
- [Commit Conventions](references/commit-conventions.md)
