# Expo Router Patterns

## File-Based Routing

Routes map directly to files under `app/`. Groups (`(group)`) organise routes without affecting the URL.

```
app/
├── (auth)/
│   ├── _layout.tsx       ← Stack for auth screens
│   ├── login.tsx
│   └── register.tsx
├── (tabs)/
│   ├── _layout.tsx       ← Tab navigator
│   ├── index.tsx         ← /
│   └── profile.tsx       ← /profile
├── event/
│   └── [id].tsx          ← /event/:id (dynamic)
└── _layout.tsx           ← Root layout (providers)
```

## Root Layout — Providers

```typescript
// app/_layout.tsx
import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider } from 'react-native-paper';
import { queryClient } from '@/lib/query-client';
import { theme } from '@/lib/theme';

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={theme}>
        <Stack screenOptions={{ headerShown: false }} />
      </PaperProvider>
    </QueryClientProvider>
  );
}
```

## Typed Route Parameters

```typescript
// app/event/[id].tsx
import { useLocalSearchParams } from 'expo-router';

type EventParams = { id: string };

export default function EventScreen() {
  const { id } = useLocalSearchParams<EventParams>();
  // id is string | string[] by default; narrow if needed:
  const eventId = Array.isArray(id) ? id[0] : id;
  ...
}
```

## Programmatic Navigation

```typescript
import { router } from 'expo-router';

// Push onto stack
router.push('/event/123');

// Replace (no back button)
router.replace('/(auth)/login');

// Navigate with params
router.push({ pathname: '/event/[id]', params: { id: eventId } });

// Go back
router.back();
```

## Stack Layout Options

```typescript
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#cba6f7' }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="home" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
```

## Protected Routes

```typescript
// app/(tabs)/_layout.tsx — redirect unauthenticated users
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';

export default function ProtectedLayout() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  return <Tabs />;
}
```

## SplashScreen — Controlled Hide

```typescript
// app/_layout.tsx
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      await loadFonts();
      await hydrateStores();
      setReady(true);
    }
    prepare().catch(console.error);
  }, []);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;
  return <Stack />;
}
```

## Absolute Imports

Configure `tsconfig.json` and `babel.config.js`:

```json
// tsconfig.json
{ "compilerOptions": { "baseUrl": ".", "paths": { "@/*": ["src/*"] } } }
```

```javascript
// babel.config.js
module.exports = {
  presets: ['babel-preset-expo'],
  plugins: [['module-resolver', { alias: { '@': './src' } }]],
};
```
