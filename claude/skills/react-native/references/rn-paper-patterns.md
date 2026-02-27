# React Native Paper Patterns

## PaperProvider + Custom Theme

React Native Paper uses the MD3 (Material Design 3) colour system. Define your palette once and
pass it to `PaperProvider`.

```typescript
// src/lib/theme.ts
import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';

// Replace these values with your design system's colours
const palette = {
  primary: '#6750a4',
  onPrimary: '#ffffff',
  primaryContainer: '#eaddff',
  secondary: '#625b71',
  background: '#fffbfe',
  surface: '#fffbfe',
  error: '#b3261e',
};

export const lightTheme = {
  ...MD3LightTheme,
  colors: { ...MD3LightTheme.colors, ...palette },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#d0bcff',
    onPrimary: '#381e72',
    background: '#1c1b1f',
    surface: '#1c1b1f',
    error: '#f2b8b5',
  },
};

export type AppTheme = typeof lightTheme;
```

```typescript
// app/_layout.tsx
import { PaperProvider } from 'react-native-paper';
import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme } from '@/lib/theme';

export default function RootLayout() {
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? darkTheme : lightTheme;
  return <PaperProvider theme={theme}><Stack /></PaperProvider>;
}
```

## useTheme Hook

```typescript
import { useTheme } from 'react-native-paper';
import type { AppTheme } from '@/lib/theme';

export function MyComponent() {
  const theme = useTheme<AppTheme>();
  return <View style={{ backgroundColor: theme.colors.surface }} />;
}
```

## TextInput

```typescript
import { TextInput, HelperText } from 'react-native-paper';

<TextInput
  label="Display name"
  mode="outlined"           // or "flat"
  value={value}
  onChangeText={onChange}
  error={!!error}
  right={<TextInput.Icon icon="account" />}
/>
<HelperText type="error" visible={!!error}>{error?.message}</HelperText>
```

## Button Variants

```typescript
import { Button } from 'react-native-paper';

// Primary action
<Button mode="contained" onPress={handleSave} loading={isSubmitting}>Save</Button>

// Secondary
<Button mode="outlined" onPress={handleCancel}>Cancel</Button>

// Tertiary / text
<Button mode="text" onPress={handleSkip}>Skip</Button>

// With icon
<Button icon="plus" mode="contained-tonal" onPress={handleAdd}>Add Event</Button>
```

## Dialog

```typescript
import { Dialog, Portal, Text, Button } from 'react-native-paper';

function DeleteConfirmDialog({ visible, onDismiss, onConfirm }: Props) {
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>Delete event?</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium">This action cannot be undone.</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancel</Button>
          <Button onPress={onConfirm} textColor={theme.colors.error}>Delete</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
```

## Snackbar

```typescript
import { Snackbar, Portal } from 'react-native-paper';
import { useState } from 'react';

function useSnackbar() {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');

  const show = (msg: string) => { setMessage(msg); setVisible(true); };
  const hide = () => setVisible(false);

  const SnackbarComponent = () => (
    <Portal>
      <Snackbar visible={visible} onDismiss={hide} duration={3000}>
        {message}
      </Snackbar>
    </Portal>
  );

  return { show, SnackbarComponent };
}
```

## Card

```typescript
import { Card, Text } from 'react-native-paper';

<Card mode="elevated" onPress={() => router.push(`/event/${event.id}`)}>
  <Card.Cover source={{ uri: event.coverImageUrl }} />
  <Card.Content>
    <Text variant="titleMedium">{event.title}</Text>
    <Text variant="bodySmall">{formatDate(event.date)}</Text>
  </Card.Content>
  <Card.Actions>
    <Button onPress={handleRsvp}>RSVP</Button>
  </Card.Actions>
</Card>
```

## Portal — Rendering above all other views

Dialogs, Snackbars, tooltips, and FAB menus should render inside `<Portal>` to avoid z-index issues.
`PaperProvider` includes a `Portal.Host` automatically — no extra setup needed.

## List and Divider

```typescript
import { List, Divider } from 'react-native-paper';

<List.Section>
  <List.Subheader>Upcoming</List.Subheader>
  {events.map(event => (
    <React.Fragment key={event.id}>
      <List.Item
        title={event.title}
        description={event.venue}
        left={props => <List.Icon {...props} icon="calendar" />}
        onPress={() => router.push(`/event/${event.id}`)}
      />
      <Divider />
    </React.Fragment>
  ))}
</List.Section>
```
