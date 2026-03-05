# CLAUDE.md — Global Claude Instructions

Loaded for every project. Project-level `CLAUDE.md` files extend or override these defaults.

---

## Plan Mode Protocol

1. **Read-only exploration phase** — use only read tools (Glob, Grep, Read, WebFetch). No edits.
2. **Structured report** — produce a plan with: context, affected files, step-by-step changes, trade-offs.
3. **User approval** — wait for explicit approval before writing a single line of code.
4. Never skip plan mode for tasks touching >2 files or requiring architectural decisions.

## Bug Investigation Protocol

1. **Investigate first** — read all relevant files, trace call sites, reproduce the issue mentally.
2. **Report findings** — describe root cause, blast radius, and proposed fix before touching anything.
3. **Approval before fix** — wait for user to confirm the approach.
4. If you cannot reproduce the issue from the code alone, ask one focused clarifying question.

---

## SOLID Principles (TypeScript / React Native)

### Single Responsibility
Each screen, hook, service, or component does one thing.

```typescript
// Bad: screen fetches, transforms, and renders
export function UserScreen() {
  const [users, setUsers] = useState([]);
  useEffect(() => { fetch('/users').then(r => r.json()).then(setUsers); }, []);
  return <FlatList data={users.map(u => ({ ...u, label: u.firstName + ' ' + u.lastName }))} />;
}

// Good: responsibility split across layers
export function UserScreen() {
  const { data } = useUsers();          // hook owns fetching
  return <UserList users={data ?? []} />; // component owns rendering
}
```

### Open/Closed — Composition over Conditionals
```typescript
// Bad
function Button({ variant }: { variant: 'primary' | 'ghost' }) {
  if (variant === 'primary') return <PrimaryBtn />;
  return <GhostBtn />;
}

// Good — extend by adding variants, not modifying existing ones
const buttonVariants = { primary: PrimaryBtn, ghost: GhostBtn } as const;
function Button({ variant }: { variant: keyof typeof buttonVariants }) {
  const Comp = buttonVariants[variant];
  return <Comp />;
}
```

### Interface Segregation — Narrow Props/DTOs
```typescript
// Bad — every consumer gets the full User
function Avatar({ user }: { user: User }) { ... }

// Good — component declares only what it needs
function Avatar({ avatarUrl, displayName }: { avatarUrl: string; displayName: string }) { ... }
```

---

## DRY

- Extract logic into a custom hook when it appears in ≥2 components.
- Barrel-export from `index.ts` in each feature directory.
- Share constants (query keys, route names, zod schemas) from a single source of truth.

```typescript
// query-keys.ts — single source of truth
export const queryKeys = {
  users: {
    all: ['users'] as const,
    detail: (id: string) => ['users', id] as const,
  },
};
```

---

## TypeScript Strict Mode

- `strict: true` in `tsconfig.json` — non-negotiable.
- Never use `any`. Use `unknown` at boundaries and narrow with Zod or type guards.
- Infer types from Zod schemas:
  ```typescript
  const UserSchema = z.object({ id: z.string(), name: z.string() });
  type User = z.infer<typeof UserSchema>; // derive, don't duplicate
  ```
- Prefer `satisfies` for const objects with known shapes.
- Use `as const` for literal arrays/objects used as discriminants.

---

## Conventional Commits

```
type(scope): imperative subject (≤72 chars)

Optional body — explain WHY, not what. Wrap at 72 chars.

BREAKING CHANGE: description  ← only when API/contract changes
```

### Type Table

| Type | When to use |
|------|-------------|
| `feat` | New user-facing capability |
| `fix` | Bug fix |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | Performance improvement |
| `test` | Adding or correcting tests |
| `docs` | Documentation only |
| `chore` | Build process, dependency updates, tooling |
| `build` | Changes to build system or compilation |
| `ci` | CI/CD pipeline changes |
| `revert` | Reverting a previous commit |

### Scope Examples (React Native)

```
feat(auth): add biometric login with expo-local-authentication
fix(feed): resolve infinite scroll duplicate entries on refetch
refactor(profile): extract useProfileForm hook from ProfileScreen
perf(images): lazy-load thumbnails with expo-image
test(auth): add unit tests for useLoginForm validation
chore(deps): upgrade expo-router to 4.x
```

### ⚠️ CRITICAL: No AI Watermarks

Under NO circumstances should you include AI attribution in commit messages.
- DO NOT add "Generated with Claude Code".
- DO NOT add "Co-Authored-By: Claude...".
- Remove any such trademarks or targeting before executing a commit.

---

## Testing Standards

- **≥80% coverage** on new code. Run tests before every commit.
- **Unit tests**: pure functions, hooks (`renderHook`), reducers/slices.
- **Integration tests**: component render with real query client and store.
- Never mock what you can use directly (e.g., Zustand stores can be used as-is in tests).
- Use `waitFor`/`act` correctly — no arbitrary `setTimeout` in tests.
- Test accessibility: prefer `getByRole` and `getByLabelText` over `getByTestId`.

---

## Security Rules

- No secrets, API keys, or credentials in any committed file.
- Validate all user input and external API responses at the boundary (Zod schemas).
- Use `expo-secure-store` for sensitive persistence (tokens, user credentials).
- Sanitize before rendering user-generated content — no raw HTML injection.

---

## Skills

Claude Code skills are in `~/.claude/skills/`. Invoke with `/skill <name>`.

Available skills:
- **react-native** — Expo Router, TanStack Query, Zustand+Immer, Zod forms, i18n, RN Paper, testing
- **pr-standards** — PR size limits, branch naming, description template, review rules, merge strategy
