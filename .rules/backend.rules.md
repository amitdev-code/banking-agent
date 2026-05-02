# Backend Rules (NestJS)

## Module Architecture

- Every feature is a NestJS module — no logic outside a module
- Module structure: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `*.repository.ts` (if DB access)
- Each module folder contains its own `dto/` subfolder
- Modules are imported into `AppModule` — no dynamic global registration except guards/interceptors

## Controller Rules

- Controllers are routing-only: parse request → call service → return DTO
- No business logic, no Prisma calls, no conditional logic beyond auth
- Max ~20 lines per controller method
- Always use `@HttpCode()` explicitly for non-200 responses
- Always validate request body with `class-validator` DTOs

## Service Rules

- All business logic lives in services
- Services may call repositories, other services, or the AI package — never Prisma directly
- Services are unit-testable: inject dependencies via constructor
- One service per module; split into multiple if >200 lines

## Repository Rules

- Repositories own all Prisma queries for a given entity
- Every Prisma query MUST include `tenantId` in the where clause
- Never use `findUnique` without also checking `tenantId` in a follow-up or combined where
- Return domain types from `@banking-crm/types`, not raw Prisma models

## DTOs

- Input DTOs: use `class-validator` decorators (`@IsString()`, `@IsEnum()`, `@IsOptional()`, etc.)
- Output DTOs: plain interfaces or classes with `@Exclude()` / `@Expose()` for serialization
- All DTOs exported from the module's `dto/` folder
- No `any` in DTOs — use specific types

## Guards

- `SessionGuard`: applied globally via `APP_GUARD` — all routes authenticated unless `@Public()`
- `RolesGuard`: applied per controller/method via `@Roles(Role.ADMIN)` decorator
- `TenantIsolationGuard`: validates every data request is scoped to the session's `tenantId`

## Interceptors

- `PiiMaskingInterceptor`: global — all HTTP responses pass through PII field masking
- `TenantContextInterceptor`: attaches tenant to response for logging

## Middleware

- `TenantResolutionMiddleware`: runs before guards — reads `X-Tenant-Slug` header, attaches `req.tenant`
- Applied to all routes in `AppModule.configure()`

## Error Handling

- Throw `NotFoundException`, `ForbiddenException`, `UnauthorizedException`, `BadRequestException` from `@nestjs/common`
- Never throw raw `Error` from a service
- `HttpExceptionFilter` catches all and returns consistent `{ statusCode, message, timestamp }` shape
- Never expose stack traces in production responses

## Session

- Session user shape: `{ id, tenantId, role, piiVisibility }` — never store fat session data
- Session stored in PostgreSQL via `connect-pg-simple`
- Session cookie: `httpOnly: true`, `sameSite: 'strict'`, `secure: true` in production

## Rate Limiting

- `@nestjs/throttler` applied on `POST /crm/run` — 5 requests/minute per `user.id`
- Throttler key is user ID, not IP — prevents per-user abuse, not per-IP

## Logging

- Use NestJS built-in `Logger` — `this.logger = new Logger(ClassName.name)`
- Log at: service method entry (debug), errors (error), slow queries (warn)
- Never log PII fields (name, phone, email, pan, aadhaar)
