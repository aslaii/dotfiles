# Zod Forms Patterns

## Schema Definition

```typescript
import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type LoginFormValues = z.infer<typeof LoginSchema>;
```

## useForm with zodResolver

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

export function useLoginForm(onSubmit: (values: LoginFormValues) => Promise<void>) {
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onBlur',      // validate on blur for better UX
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(values);
    } catch (error) {
      form.setError('root', { message: 'Login failed. Please try again.' });
    }
  });

  return { form, handleSubmit };
}
```

## Controller with React Native Paper

```typescript
// src/screens/auth/LoginScreen.tsx
import { Controller } from 'react-hook-form';
import { TextInput, Button, HelperText } from 'react-native-paper';
import { useLoginForm } from './use-login-form';

export default function LoginScreen() {
  const { mutateAsync: login } = useLoginMutation();
  const { form, handleSubmit } = useLoginForm(login);
  const { control, formState: { errors, isSubmitting } } = form;

  return (
    <View>
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <>
            <TextInput
              label="Email"
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={!!errors.email}
            />
            <HelperText type="error" visible={!!errors.email}>
              {errors.email?.message}
            </HelperText>
          </>
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <>
            <TextInput
              label="Password"
              mode="outlined"
              secureTextEntry
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={!!errors.password}
            />
            <HelperText type="error" visible={!!errors.password}>
              {errors.password?.message}
            </HelperText>
          </>
        )}
      />

      {errors.root && (
        <HelperText type="error" visible>{errors.root.message}</HelperText>
      )}

      <Button mode="contained" onPress={handleSubmit} loading={isSubmitting}>
        Sign In
      </Button>
    </View>
  );
}
```

## Cross-Field Validation

```typescript
export const RegisterSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'], // attach error to this field
  });
```

## Complex Schema with .superRefine

```typescript
export const EventSchema = z
  .object({
    title: z.string().min(3).max(100),
    startDate: z.date(),
    endDate: z.date(),
    ticketPrice: z.number().nonnegative().optional(),
    isFree: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.endDate <= data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'End date must be after start date',
        path: ['endDate'],
      });
    }
    if (!data.isFree && data.ticketPrice == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Ticket price is required for paid events',
        path: ['ticketPrice'],
      });
    }
  });
```

## Nested Objects and Arrays

```typescript
export const VenueSchema = z.object({
  name: z.string().min(1),
  address: z.object({
    street: z.string(),
    city: z.string(),
    postcode: z.string().regex(/^\d{4,6}$/),
  }),
  amenities: z.array(z.string()).min(1, 'Select at least one amenity'),
});
```

## Async Validation (server-side uniqueness check)

```typescript
const emailField = z.string().email().refine(
  async (email) => {
    const { available } = await apiClient.get(`/auth/check-email?email=${email}`);
    return available;
  },
  { message: 'This email is already registered' },
);
```
