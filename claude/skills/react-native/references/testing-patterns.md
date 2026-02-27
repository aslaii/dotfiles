# Testing Patterns

## Setup

```json
// package.json (jest config)
{
  "jest": {
    "preset": "jest-expo",
    "setupFilesAfterFramework": ["@testing-library/react-native/extend-expect"],
    "transformIgnorePatterns": [
      "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|zustand|@tanstack/.*))"
    ]
  }
}
```

## Testing a Hook

```typescript
// src/hooks/use-events-query.test.ts
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { useEventsQuery } from './use-events-query';

// Wrapper provides QueryClient to the hook
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useEventsQuery', () => {
  it('returns events on success', async () => {
    // Arrange — mock the API
    jest.spyOn(apiClient, 'get').mockResolvedValue([
      { id: '1', title: 'Concert', date: '2026-06-01T20:00:00Z', venue: 'Club' },
    ]);

    const { result } = renderHook(() => useEventsQuery({}), {
      wrapper: createWrapper(),
    });

    // Act — wait for async resolution
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Assert
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].title).toBe('Concert');
  });

  it('handles API errors', async () => {
    jest.spyOn(apiClient, 'get').mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useEventsQuery({}), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });
});
```

## Testing a Component

```typescript
// src/components/EventCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react-native';
import { EventCard } from './EventCard';

const mockEvent = {
  id: '1',
  title: 'Summer Festival',
  venue: 'Riverside Park',
  date: '2026-07-15T18:00:00Z',
};

describe('EventCard', () => {
  it('renders event title and venue', () => {
    render(<EventCard event={mockEvent} onPress={jest.fn()} />);

    expect(screen.getByText('Summer Festival')).toBeTruthy();
    expect(screen.getByText('Riverside Park')).toBeTruthy();
  });

  it('calls onPress with event id', () => {
    const onPress = jest.fn();
    render(<EventCard event={mockEvent} onPress={onPress} />);

    fireEvent.press(screen.getByRole('button'));

    expect(onPress).toHaveBeenCalledWith('1');
  });
});
```

## Testing a Zustand Store Hook

```typescript
// src/stores/auth-store.test.ts
import { act } from '@testing-library/react-native';
import { useAuthStore } from './auth-store';

// Reset store between tests
beforeEach(() => {
  useAuthStore.setState({ user: null, isAuthenticated: false, token: null });
});

describe('auth store', () => {
  it('sets user on login', () => {
    const mockUser = { id: '1', name: 'Alice' };
    act(() => {
      useAuthStore.getState().login(mockUser, 'token-123');
    });

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(mockUser);
  });

  it('clears user on logout', () => {
    act(() => {
      useAuthStore.setState({ user: { id: '1', name: 'Alice' }, isAuthenticated: true });
      useAuthStore.getState().logout();
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });
});
```

## Mocking TanStack Query in Component Tests

```typescript
import { useEventsQuery } from '@/hooks/use-events-query';

jest.mock('@/hooks/use-events-query');
const mockUseEventsQuery = useEventsQuery as jest.MockedFunction<typeof useEventsQuery>;

describe('FeedScreen', () => {
  it('shows loading state', () => {
    mockUseEventsQuery.mockReturnValue({ data: undefined, isLoading: true } as any);
    render(<FeedScreen />);
    expect(screen.getByRole('progressbar')).toBeTruthy();
  });

  it('renders event list', () => {
    mockUseEventsQuery.mockReturnValue({ data: [mockEvent], isLoading: false } as any);
    render(<FeedScreen />);
    expect(screen.getByText(mockEvent.title)).toBeTruthy();
  });
});
```

## Async Interactions

```typescript
import { fireEvent, waitFor } from '@testing-library/react-native';

it('submits the form', async () => {
  render(<LoginScreen />);

  fireEvent.changeText(screen.getByLabelText('Email'), 'user@example.com');
  fireEvent.changeText(screen.getByLabelText('Password'), 'secret123');
  fireEvent.press(screen.getByRole('button', { name: /sign in/i }));

  await waitFor(() => {
    expect(mockLogin).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'secret123',
    });
  });
});
```

## Accessibility Queries (prefer over testID)

```typescript
// Preferred — tests accessibility at the same time
screen.getByRole('button', { name: 'Save' });
screen.getByLabelText('Email address');
screen.getByText('Welcome back');

// Fallback — use testID only when no role/label is available
screen.getByTestId('event-cover-image');
```

## Test File Colocation

```
src/
├── hooks/
│   ├── use-events-query.ts
│   └── use-events-query.test.ts    ← co-located
├── components/
│   ├── EventCard.tsx
│   └── EventCard.test.tsx          ← co-located
└── stores/
    ├── auth-store.ts
    └── auth-store.test.ts          ← co-located
```
