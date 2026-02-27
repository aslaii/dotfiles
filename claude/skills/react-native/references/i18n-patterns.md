# i18n Patterns

## Setup

```typescript
// src/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import en from './locales/en.json';
import es from './locales/es.json';
import ptBR from './locales/pt-BR.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en, common: en.common },
      es: { translation: es, common: es.common },
      'pt-BR': { translation: ptBR, common: ptBR.common },
    },
    lng: Localization.getLocales()[0]?.languageTag ?? 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    ns: ['translation', 'common'],
    defaultNS: 'translation',
  });

export default i18n;
```

Boot it before rendering the app:

```typescript
// app/_layout.tsx
import '@/i18n'; // side-effect import — initialise i18next
```

## Locale Files

```jsonc
// src/i18n/locales/en.json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "loading": "Loading…",
    "error": "Something went wrong"
  },
  "auth": {
    "login": {
      "title": "Welcome back",
      "emailLabel": "Email address",
      "passwordLabel": "Password",
      "submitButton": "Sign in",
      "forgotPassword": "Forgot password?"
    }
  },
  "feed": {
    "emptyState": "No events near you",
    "eventCount_one": "{{count}} event",
    "eventCount_other": "{{count}} events"
  }
}
```

## useTranslation Hook

```typescript
import { useTranslation } from 'react-i18next';

export default function LoginScreen() {
  const { t } = useTranslation('translation');   // default namespace
  const { t: tc } = useTranslation('common');    // common namespace

  return (
    <View>
      <Text>{t('auth.login.title')}</Text>
      <Button onPress={handleSave}>{tc('save')}</Button>
    </View>
  );
}
```

## Pluralization

```typescript
const { t } = useTranslation();

// Uses eventCount_one / eventCount_other keys automatically
const label = t('feed.eventCount', { count: events.length });
// count=1 → "1 event"
// count=5 → "5 events"
```

## Interpolation

```jsonc
// en.json
{ "welcome": "Hello, {{name}}!" }
```

```typescript
t('welcome', { name: user.displayName })  // → "Hello, Alice!"
```

## Typed Keys (optional but recommended)

Generate a typed `TFunction` by extracting key paths:

```typescript
// src/i18n/types.ts
import type en from './locales/en.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof en };
  }
}
```

With this, `t('auth.login.tilte')` will be a TypeScript error.

## Language Switching at Runtime

```typescript
import i18n from '@/i18n';

function LanguagePicker() {
  const handleChange = async (lang: string) => {
    await i18n.changeLanguage(lang);
    // Persist the preference:
    await AsyncStorage.setItem('userLanguage', lang);
  };
  ...
}
```

## Date/Number Formatting

Leverage `Intl` APIs alongside i18next for locale-aware formatting:

```typescript
const locale = i18n.language;

// Date
new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(event.date);

// Currency
new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' }).format(price);
```
