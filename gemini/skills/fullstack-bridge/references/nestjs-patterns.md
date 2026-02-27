# NestJS Patterns for Fullstack Sync

## DTO Design for Extraction
When creating DTOs, prioritize clear types and decorators that help automated tools (and Gemini CLI) understand the data structure.

### Standard DTO Structure
```typescript
import { IsString, IsInt, Min, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ description: 'The name of the user' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'The age of the user', minimum: 18 })
  @IsInt()
  @Min(18)
  age: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bio?: string;
}
```

## Validation Mapping
- **NestJS**: Use `ValidationPipe` with `whitelist: true, forbidNonWhitelisted: true`.
- **Extraction**: Ensure `@IsOptional()` DTO fields are mapped to optional properties `?` in TypeScript interfaces.

## Controller Organization
Group endpoints logically so that frontend hook generation can mirror the structure (e.g., `UsersController` -> `useUsersHooks.ts`).
