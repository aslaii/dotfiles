# TanStack Query Patterns

## QueryClient Setup

```typescript
// src/lib/query-client.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,   // 5 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});
```

## Query Key Factory

Centralise keys to avoid typos and enable precise invalidation.

```typescript
// src/lib/query-keys.ts
export const queryKeys = {
  events: {
    all: ['events'] as const,
    lists: () => [...queryKeys.events.all, 'list'] as const,
    list: (filters: EventFilters) => [...queryKeys.events.lists(), filters] as const,
    details: () => [...queryKeys.events.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.events.details(), id] as const,
  },
  profile: {
    all: ['profile'] as const,
    me: () => [...queryKeys.profile.all, 'me'] as const,
  },
} as const;
```

## useQuery Hook

```typescript
// src/hooks/use-events-query.ts
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

const EventSchema = z.object({
  id: z.string(),
  title: z.string(),
  date: z.string().datetime(),
  venue: z.string(),
});

const EventListSchema = z.array(EventSchema);
export type Event = z.infer<typeof EventSchema>;

export function useEventsQuery(filters: EventFilters) {
  return useQuery({
    queryKey: queryKeys.events.list(filters),
    queryFn: async () => {
      const data = await apiClient.get('/events', { params: filters });
      return EventListSchema.parse(data);
    },
  });
}
```

## useMutation Hook

```typescript
// src/hooks/use-rsvp-mutation.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

export function useRsvpMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (eventId: string) => apiClient.post(`/events/${eventId}/rsvp`),
    onSuccess: (_, eventId) => {
      // Invalidate the specific event to refetch attendance count
      queryClient.invalidateQueries({ queryKey: queryKeys.events.detail(eventId) });
    },
    onError: (error) => {
      console.error('RSVP failed:', error);
    },
  });
}
```

## Optimistic Updates

```typescript
export function useToggleFavouriteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (eventId: string) => apiClient.post(`/events/${eventId}/favourite`),
    onMutate: async (eventId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.events.detail(eventId) });
      const previous = queryClient.getQueryData<Event>(queryKeys.events.detail(eventId));
      queryClient.setQueryData<Event>(queryKeys.events.detail(eventId), (old) =>
        old ? { ...old, isFavourited: !old.isFavourited } : old,
      );
      return { previous };
    },
    onError: (_err, eventId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.events.detail(eventId), context.previous);
      }
    },
    onSettled: (_, __, eventId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.detail(eventId) });
    },
  });
}
```

## useSuspenseQuery (React Suspense)

```typescript
import { useSuspenseQuery } from '@tanstack/react-query';
import { Suspense } from 'react';
import { ActivityIndicator } from 'react-native-paper';

function EventDetail({ id }: { id: string }) {
  // Throws a Promise — parent Suspense boundary catches it
  const { data } = useSuspenseQuery({
    queryKey: queryKeys.events.detail(id),
    queryFn: () => apiClient.get<Event>(`/events/${id}`),
  });
  return <EventCard event={data} />;
}

// Wrap at screen level:
export default function EventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Suspense fallback={<ActivityIndicator />}>
      <EventDetail id={id} />
    </Suspense>
  );
}
```

## Infinite Scroll (useSuspenseInfiniteQuery)

```typescript
import { useInfiniteQuery } from '@tanstack/react-query';

export function useFeedQuery() {
  return useInfiniteQuery({
    queryKey: queryKeys.events.lists(),
    queryFn: ({ pageParam }) => apiClient.get('/feed', { params: { cursor: pageParam } }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

// In component:
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useFeedQuery();
const items = data?.pages.flatMap(p => p.events) ?? [];
```
