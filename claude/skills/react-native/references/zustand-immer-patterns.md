# Zustand + Immer Patterns

## Basic Store with Immer

```typescript
// src/stores/auth-store.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
}

interface AuthActions {
  login: (user: User, token: string) => void;
  logout: () => void;
  updateProfile: (patch: Partial<User>) => void;
}

type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  token: null,
};

export const useAuthStore = create<AuthStore>()(
  immer((set) => ({
    ...initialState,

    login: (user, token) =>
      set((state) => {
        state.user = user;
        state.token = token;
        state.isAuthenticated = true;
      }),

    logout: () =>
      set((state) => {
        Object.assign(state, initialState); // reset to initial
      }),

    updateProfile: (patch) =>
      set((state) => {
        if (state.user) Object.assign(state.user, patch);
      }),
  })),
);
```

## Selectors (co-located, memoised)

```typescript
// Alongside the store definition — export named selectors
export const selectUser = (state: AuthStore) => state.user;
export const selectIsAuthenticated = (state: AuthStore) => state.isAuthenticated;

// Usage — subscribes only to `user`
const user = useAuthStore(selectUser);
```

## useShallow for Multiple Fields

Without `useShallow`, the component re-renders whenever any part of the store changes.

```typescript
import { useShallow } from 'zustand/react/shallow';

// Re-renders only when user or isAuthenticated change
const { user, isAuthenticated } = useAuthStore(
  useShallow((s) => ({ user: s.user, isAuthenticated: s.isAuthenticated })),
);
```

## Slice Pattern (large stores)

Split large stores into slices and combine them.

```typescript
// src/stores/slices/filter-slice.ts
import { StateCreator } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export interface FilterSlice {
  genre: string | null;
  dateRange: [Date, Date] | null;
  setGenre: (genre: string | null) => void;
  clearFilters: () => void;
}

export const createFilterSlice: StateCreator<
  FilterSlice,
  [['zustand/immer', never]],
  [],
  FilterSlice
> = (set) => ({
  genre: null,
  dateRange: null,
  setGenre: (genre) => set((s) => { s.genre = genre; }),
  clearFilters: () => set((s) => { s.genre = null; s.dateRange = null; }),
});

// src/stores/app-store.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { createFilterSlice, FilterSlice } from './slices/filter-slice';
import { createFeedSlice, FeedSlice } from './slices/feed-slice';

type AppStore = FilterSlice & FeedSlice;

export const useAppStore = create<AppStore>()(
  immer((...args) => ({
    ...createFilterSlice(...args),
    ...createFeedSlice(...args),
  })),
);
```

## Persist with expo-secure-store

```typescript
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';

const secureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const useAuthStore = create<AuthStore>()(
  persist(
    immer((set) => ({
      ...initialState,
      login: (user, token) => set((s) => { s.user = user; s.token = token; s.isAuthenticated = true; }),
      logout: () => set((s) => { Object.assign(s, initialState); }),
    })),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => secureStorage),
      // Only persist sensitive fields
      partialize: (state) => ({ token: state.token, user: state.user }),
    },
  ),
);
```

## Reset on Logout

Call `logout()` from the auth store and then reset other stores:

```typescript
// src/lib/reset-stores.ts
import { useAuthStore } from '@/stores/auth-store';
import { useAppStore } from '@/stores/app-store';

export function resetAllStores() {
  useAuthStore.getState().logout();
  useAppStore.setState(initialAppState);
}
```
