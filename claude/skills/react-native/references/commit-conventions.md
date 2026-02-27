# Commit Conventions

## Format

```
type(scope): imperative subject (≤72 chars)

Optional body — explain WHY, not what. Wrap at 72 chars.
Use present tense: "add feature" not "added feature".

BREAKING CHANGE: description of the breaking change
```

## Type Table

| Type | When to use |
|------|-------------|
| `feat` | New user-facing capability |
| `fix` | Bug fix (user-visible or functional) |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | Performance improvement |
| `test` | Adding, updating, or fixing tests only |
| `docs` | Documentation only (comments, README, CHANGELOG) |
| `chore` | Dependency updates, tooling, non-functional maintenance |
| `build` | Build system changes (metro config, babel, webpack) |
| `ci` | CI/CD pipeline configuration |
| `revert` | Reverting a previous commit |

## Scope Examples

Common scopes for a React Native project — adjust to match your app's domain:

```
auth        — authentication flows
feed        — home/discovery feed
profile     — user profile screens
<feature>   — your feature domain (e.g., events, orders, chat)
forms       — shared form components
navigation  — routing and navigation
store       — global state management
api         — API client and hooks
i18n        — localization
ui          — shared UI components
deps        — dependency updates
```

## Full Commit Message Examples

### feat
```
feat(auth): add biometric login with expo-local-authentication

Users can now authenticate with Face ID or fingerprint on supported
devices. Falls back to PIN entry when biometrics are unavailable.
```

### fix
```
fix(feed): resolve duplicate entries on infinite scroll refetch

The feed was appending duplicate items when the user pulled-to-refresh
mid-pagination. Fix: reset cursor to undefined before re-fetching.
```

### refactor
```
refactor(profile): extract useProfileForm hook from ProfileScreen

ProfileScreen exceeded 200 lines; form state and validation are now
in a co-located hook following the single-responsibility guideline.
```

### perf
```
perf(feed): lazy-load thumbnails using expo-image placeholder

Reduces initial LCP from ~2.4 s to ~0.8 s on slower connections by
deferring image decode until items enter the viewport.
```

### test
```
test(auth): add unit tests for useLoginForm validation

Covers: email format validation, password min-length, cross-field
confirm-password mismatch, and root server error handling.
```

### chore
```
chore(deps): upgrade expo-router to 4.0.8

Picks up the fix for stale params on fast navigation (expo-router#2341).
```

### docs
```
docs(api): add JSDoc to queryKeys factory explaining cache strategy
```

### build
```
build: configure metro bundler for SVG transformer
```

### ci
```
ci: add EAS build workflow for production iOS release
```

### revert
```
revert: feat(auth): add biometric login with expo-local-authentication

Reverts commit abc1234. Biometric implementation is blocking the
release due to a crash on Android API 29. Will re-land in a follow-up.
```

## Breaking Changes

Add `BREAKING CHANGE:` in the commit footer (not the subject line):

```
feat(api): replace REST endpoints with GraphQL subscriptions

Migrates the event feed from polling REST to GraphQL subscriptions.
All existing REST-based hooks are removed.

BREAKING CHANGE: useEventsQuery and useEventDetail are removed.
Replace with useEventsFeed and useEventSubscription respectively.
```

## Rules

- Subject line: imperative mood, lowercase after the colon, no trailing period.
- Body: separated by a blank line from the subject. Explain WHY, not what.
- One logical change per commit. Atomic commits are easier to revert and review.
- No "WIP", "temp", or "fix typo" subjects in the main branch — squash or reword before merging.
- Co-author attribution: `Co-authored-by: Name <email>` in the footer when pairing.
