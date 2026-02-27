# Frontend Patterns for Fullstack Sync

## TanStack Query (React Query) Hooks
Standardize the structure of your hooks to ensure they are predictable and easy to regenerate.

### Hook Template
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api-client';
import { CreateUserDto, UserInterface } from '../types';

export const useUsers = () => {
  const queryClient = useQueryClient();

  const getUsers = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<UserInterface[]>('/users').then(res => res.data),
  });

  const createUser = useMutation({
    mutationFn: (data: CreateUserDto) => api.post('/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  return { getUsers, createUser };
};
```

## React Native API Configuration
React Native requires specific handling for the API base URL, especially when testing on physical devices or Android emulators.

- **iOS Simulator**: `localhost` or `127.0.0.1`.
- **Android Emulator**: `10.0.2.2`.
- **Physical Device**: Use the machine's local IP (e.g., `192.168.1.x`).

### Dynamic API Client
```typescript
const getBaseUrl = () => {
  if (__DEV__) {
    // Platform-specific logic here
    return 'http://10.0.2.2:3000'; // Example for Android
  }
  return 'https://api.production.com';
};
```

## Shared Types Management
Maintain a `types/` directory that mirrors the backend's `dto/` directory. Use `.ts` files rather than `.d.ts` if you need to export enums or constants.
