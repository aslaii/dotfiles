# Component Architecture

## SOLID in React Native

### Single Responsibility — One Concern Per Screen

Each screen file is responsible only for layout and composition. All logic lives in a co-located hook.

```typescript
// screens/EventDetailScreen.tsx — layout only
export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { event, isLoading, handleRsvp } = useEventDetailScreen(id);

  if (isLoading) return <LoadingState />;
  if (!event) return <EmptyState message="Event not found" />;

  return (
    <ScrollView>
      <EventHeader event={event} />
      <EventDetails event={event} />
      <RsvpButton onPress={handleRsvp} />
    </ScrollView>
  );
}

// hooks/use-event-detail-screen.ts — logic only
export function useEventDetailScreen(id: string) {
  const { data: event, isLoading } = useEventQuery(id);
  const { mutate: rsvp } = useRsvpMutation();
  const handleRsvp = () => rsvp(id);
  return { event, isLoading, handleRsvp };
}
```

### Extract Hooks at ≥2 Usages

If the same fetch/state logic appears in two components, extract it into a shared hook.

```typescript
// Before: duplicated in ProfileScreen and EditProfileScreen
const [user, setUser] = useState<User>();
useEffect(() => { fetchUser().then(setUser); }, []);

// After: shared hook
export function useCurrentUser() {
  return useQuery({ queryKey: queryKeys.profile.me(), queryFn: fetchMe });
}
```

### Open/Closed — Extend Without Modifying

```typescript
// Closed for modification — open for extension via variants map
const listItemVariants = {
  default: DefaultListItem,
  compact: CompactListItem,
  featured: FeaturedListItem,
} as const;

type ListItemVariant = keyof typeof listItemVariants;

function ListItem({ variant = 'default', ...props }: ListItemProps & { variant?: ListItemVariant }) {
  const Component = listItemVariants[variant];
  return <Component {...props} />;
}
```

### Interface Segregation — Narrow Props

```typescript
// Bad — component receives the entire domain object
function ArtistAvatar({ artist }: { artist: Artist }) {
  return <Avatar uri={artist.profileImageUrl} label={artist.stageName} />;
}

// Good — component declares only what it uses
function ArtistAvatar({ profileImageUrl, stageName }: Pick<Artist, 'profileImageUrl' | 'stageName'>) {
  return <Avatar uri={profileImageUrl} label={stageName} />;
}
```

---

## DRY

### Shared Primitives

Co-locate reusable atomic components in `src/components/ui/`:

```
src/components/
├── ui/
│   ├── Avatar.tsx
│   ├── Badge.tsx
│   ├── EmptyState.tsx
│   ├── LoadingState.tsx
│   ├── ErrorState.tsx
│   └── index.ts          ← barrel export
└── features/
    ├── events/
    └── profile/
```

### Barrel Exports

```typescript
// src/components/ui/index.ts
export { Avatar } from './Avatar';
export { Badge } from './Badge';
export { EmptyState } from './EmptyState';
export { LoadingState } from './LoadingState';
export { ErrorState } from './ErrorState';

// Usage
import { Avatar, EmptyState, LoadingState } from '@/components/ui';
```

---

## Prop Conventions

| Convention | Rule |
|------------|------|
| Event handlers | Prefix with `on` — `onPress`, `onSubmit`, `onDismiss` |
| Boolean flags | Use `is`/`has`/`can` prefix — `isLoading`, `hasError`, `canEdit` |
| Children | Use `children: ReactNode` or `renderItem` for lists |
| Style overrides | Accept `style?: StyleProp<ViewStyle>` for layout composability |
| Test IDs | Use `testID` only as a fallback when no accessible role/label exists |

```typescript
interface CardProps {
  title: string;
  isLoading?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}
```

---

## Memoization Rules

Memoize **only** when:
1. The component renders frequently inside a list (`FlatList` items).
2. Profiler confirms unnecessary re-renders causing dropped frames.
3. An expensive pure computation is repeated on every render.

```typescript
// Good use — list item that renders in a FlatList of 100+ items
const EventListItem = React.memo(function EventListItem({ event, onPress }: Props) {
  return <Pressable onPress={() => onPress(event.id)}>...</Pressable>;
});

// Good use — expensive pure derivation
const sortedEvents = useMemo(
  () => [...events].sort((a, b) => a.date.localeCompare(b.date)),
  [events],
);

// Bad use — memo on a simple static component (adds overhead for no benefit)
const Title = React.memo(({ text }: { text: string }) => <Text>{text}</Text>);
```

Avoid `useCallback` on every function; use it only when the callback is passed as a prop to
a memoized child or as a dependency to `useEffect`/`useMemo`.

---

## File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Screen component | `PascalCase.tsx` | `EventDetailScreen.tsx` |
| Screen hook | `use-kebab-case.ts` | `use-event-detail-screen.ts` |
| Reusable component | `PascalCase.tsx` | `ArtistCard.tsx` |
| Hook | `use-kebab-case.ts` | `use-current-user.ts` |
| Store | `kebab-case-store.ts` | `auth-store.ts` |
| Utility | `kebab-case.ts` | `format-date.ts` |
| Types | `kebab-case.types.ts` | `event.types.ts` |
