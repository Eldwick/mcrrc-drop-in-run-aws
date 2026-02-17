# MCRRC Run Finder (AWS Refactor)

A web app that helps Montgomery County Road Runners Club members discover weekly drop-in group runs by location and pace. Runners enter where they are and how fast they run; the app shows them the best matches on a map. Run organizers can list and manage their runs without creating an account.

This is a refactor of the [original MCRRC Run Finder](~/projects/mcrrc_drop_in_runs) — same Next.js frontend, with the entire stack migrated from Vercel + Neon Postgres to AWS (Amplify Hosting for frontend, API Gateway + Lambda + DynamoDB for backend). Everything is hosted on AWS — no Vercel.

See @docs/PRD.md for the full product requirements document.

## Tech Stack

- **Framework:** Next.js 15 (App Router) with TypeScript (strict mode)
- **Database:** Amazon DynamoDB (single-table design)
- **Backend:** AWS Lambda (Node.js 20, TypeScript)
- **API:** Amazon API Gateway (REST)
- **IaC:** AWS CDK (TypeScript)
- **Styling:** Tailwind CSS (mobile-first)
- **Map:** Leaflet + React-Leaflet + OpenStreetMap tiles
- **Geocoding:** Nominatim (OpenStreetMap) — free, no API key
- **Testing:** Vitest + @testing-library/react
- **Hosting:** All on AWS — frontend on AWS Amplify Hosting, backend on API Gateway + Lambda

## Commands

### Frontend (`/frontend`)

- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run lint` — ESLint check
- `npm run typecheck` — TypeScript type checking (`tsc --noEmit`)
- `npm run test` — Run all Vitest tests
- `npm run test:watch` — Run tests in watch mode
- `npm run test:coverage` — Run tests with coverage report

### Infrastructure (`/infra`)

- `npx cdk synth` — Synthesize CloudFormation template
- `npx cdk deploy` — Deploy all stacks to AWS
- `npx cdk deploy --hotswap` — Fast-deploy Lambda code changes (dev only)
- `npx cdk diff` — Show pending infrastructure changes
- `npx cdk destroy` — Tear down all stacks

### Data Scripts

- `npx tsx scripts/seed-dynamodb.ts` — Seed DynamoDB with initial MCRRC run data

## Architecture

```
/frontend/src/               # Next.js app
  /app                       # App Router pages and layouts
    /page.tsx                 # Home — map + seeker search interface
    /runs/new/page.tsx        # Add a Run form
    /runs/[id]/page.tsx       # Run detail view
    /runs/[id]/edit/page.tsx  # Edit a Run (requires ?token= query param)
  /components                 # React components
    /ui/                      # Generic reusable UI components
    /map/                     # Map-specific components (Leaflet wrappers)
    /forms/                   # Run creation/edit form components
  /lib                        # Shared utilities
    /utils/                   # Helper functions (haversine, scoring, etc.)
    /types/                   # Shared TypeScript types and Zod schemas
  /hooks                      # Custom React hooks

/lambda/                      # Lambda handlers
  /runs/                      # Runs CRUD handlers
    create.ts                 # POST /runs
    get.ts                    # GET /runs/{id}
    list.ts                   # GET /runs
    update.ts                 # PUT /runs/{id}
  /geocode/                   # Geocoding proxy
    handler.ts                # GET /geocode
  /shared/                    # Shared Lambda utilities
    dynamo-client.ts          # DynamoDB DocumentClient singleton
    response.ts               # API Gateway response helpers
    validators.ts             # Zod schemas for request validation

/infra/                       # AWS CDK
  /lib/                       # CDK stack definitions
    api-stack.ts              # API Gateway + Lambda functions
    database-stack.ts         # DynamoDB table + GSIs
    frontend-stack.ts         # AWS Amplify Hosting for frontend
  /bin/                       # CDK entry point
    app.ts                    # CDK app instantiation

/scripts/                     # Utility scripts
  seed-dynamodb.ts            # Seed DynamoDB table with initial data
```

## Code Style

- TypeScript strict mode. No `any` types — use `unknown` and narrow, or define proper types.
- Use named exports, not default exports, except for Next.js page/layout components which require default exports.
- Use ES module imports. No `require()`.
- Prefer `interface` over `type` for object shapes. Use `type` for unions, intersections, and utility types.
- Use Zod for runtime validation of all API inputs. Colocate Zod schemas with their corresponding types in `/frontend/src/lib/types/` (frontend) and `/lambda/shared/validators.ts` (Lambda).
- Prefer server components by default. Only add `"use client"` when the component needs interactivity, browser APIs, or hooks.
- Tailwind for all styling. No CSS modules, no styled-components, no inline `style` attributes.
- Prefer `const` arrow functions for component definitions: `const RunCard = () => { ... }`.

### Lambda Handler Conventions

- **Thin handlers:** Each Lambda handler file exports a single handler function. Business logic goes in shared modules, not inline in handlers.
- **Type all handlers** with `APIGatewayProxyHandler` from `@types/aws-lambda`.
- **Always return** a well-formed `APIGatewayProxyResult` — use the helpers in `/lambda/shared/response.ts`.
- **Stateless:** Handlers must not rely on in-memory state between invocations. Every invocation is independent.
- **Environment variables** are the only configuration mechanism — read from `process.env`, never hardcode resource names.

## Database Conventions

### Single-Table DynamoDB Design

All entities live in one DynamoDB table. The schema uses composite keys:

| Entity | PK | SK | Description |
|--------|----|----|-------------|
| Run | `RUN#<uuid>` | `METADATA` | The run listing with all its fields |

### Key Schema

- **Partition Key (`PK`):** String. Format: `ENTITY#<id>` (e.g., `RUN#a1b2c3d4`)
- **Sort Key (`SK`):** String. Format: entity-specific (e.g., `METADATA`)

### Global Secondary Indexes

| GSI Name | PK | SK | Purpose |
|----------|----|----|---------|
| `GSI1` | `GSI1PK` = `ACTIVE_RUN` | `GSI1SK` = `DAY#<dayOfWeek>` | Query all active runs, optionally by day |

- The GSI projection **excludes** `editToken` — public queries never see it.

### DynamoDB Conventions

- Use AWS SDK v3 `@aws-sdk/lib-dynamodb` (DocumentClient) for all reads and writes.
- Use `camelCase` for all attribute names in DynamoDB items.
- All items must have `createdAt` and `updatedAt` ISO 8601 timestamp strings.
- The `editToken` is stored on the base table item but excluded from GSI projections. Direct `GetItem` by PK/SK is needed for edit operations.
- No SQL. Table and GSI structure are defined in CDK (`/infra/lib/database-stack.ts`).
- Use `uuid` (v4) for run IDs and edit tokens.

### Data Integrity (IMPORTANT)

DynamoDB does not enforce schemas, uniqueness constraints, NOT NULL, or column-level type checking the way Postgres does. **All data integrity is enforced at the application layer in Lambda handlers.** These protections are deliberate and must be maintained as the app evolves:

- **Zod schemas use `.strict()`** — unknown/unexpected fields in request bodies are rejected with 400, not silently stripped. This prevents injection of system fields like `PK`, `editToken`, `createdAt`, etc. through the API.
- **Create handler uses `ConditionExpression: "attribute_not_exists(PK)"`** — prevents silent overwrites on PK collision (replaces Postgres's UNIQUE constraint on primary key).
- **Update handler uses a field allowlist (`UPDATABLE_FIELDS`)** — only explicitly listed business fields can be written. System fields (`PK`, `SK`, `GSI1PK`, `GSI1SK`, `editToken`, `createdAt`, `id`) are never writable through the update path.
- **Update handler uses `ReturnValues: "ALL_NEW"`** — responses reflect the authoritative post-write state from DynamoDB, not a stale merge of pre-read + input.
- **Empty updates are rejected** — an update request with no actual field changes returns 400 instead of making a wasteful DynamoDB write.

**Treat data model changes like migrations.** Even though there's no formal migration framework, any change to the item schema (adding/removing/renaming attributes, changing types, modifying key structure or GSI definitions) should be treated with the same rigor as a database migration:

1. Update the Zod schemas in `lambda/shared/validators.ts` first — they are the source of truth for what the API accepts.
2. Update the `UPDATABLE_FIELDS` allowlist in `lambda/runs/update.ts` if adding new editable fields.
3. Update the CDK table/GSI definitions in `infra/lib/database-stack.ts` if key structure changes.
4. Write tests for the new validation behavior before updating handler logic.
5. Consider existing data — DynamoDB items already in the table won't automatically gain new attributes or lose old ones. Handle both old and new shapes in read paths if needed.

## API Conventions

- All API routes are served via API Gateway backed by Lambda functions.
- Return JSON with consistent shape: `{ data: ... }` on success, `{ error: "message" }` on failure.
- Use appropriate HTTP status codes: 200 for success, 201 for creation, 400 for validation errors, 403 for invalid edit token, 404 for not found.
- Validate all request bodies with Zod before processing.
- The edit token is passed as a query parameter (`?token=xxx`), never in the request body.
- IMPORTANT: Never return `editToken` in any public-facing API response (GET /runs, GET /runs/{id}). Only return it once on POST /runs (run creation) so the organizer can save it.
- CORS is configured at the API Gateway level, not in Lambda code.

## Map & Geo Conventions

- Leaflet requires dynamic import with `ssr: false` in Next.js. Always use `next/dynamic` to import map components.
- Store coordinates as `latitude` and `longitude` number attributes in DynamoDB.
- Nominatim geocoding: rate limit to 1 request per second. Add a `User-Agent` header identifying the app. Cache results where possible.
- Haversine formula for distance calculation. Implementation goes in `/frontend/src/lib/utils/haversine.ts`. Returns distance in miles.
- Default map center: Montgomery County, MD (approximately 39.14, -77.15), zoom level 11.

## Matching & Ranking

The seeker flow uses a relevance score combining pace match and proximity:

```
relevance = (pace_score * 0.6) + (proximity_score * 0.4)
```

- `pace_score`: derived from the availability level for the user's selected pace range
  - Consistently = 1.0, Frequently = 0.7, Sometimes = 0.4, Rarely = 0.1
- `proximity_score`: `1 / (1 + distance_miles / 5)` — decays smoothly, 1.0 at zero distance
- Ranking is computed client-side after fetching all active runs (dataset is small, ~50 runs max)

## Key Domain Concepts

- **Pace ranges:** `sub_8`, `8_to_9`, `9_to_10`, `10_plus` — stored as a JSON object on the run
- **Availability levels:** `consistently`, `frequently`, `sometimes`, `rarely`
- **Edit token:** A secret URL token that grants edit access to a run. No user accounts exist. Organizers bookmark their edit link.
- **Active/inactive:** Runs can be deactivated (hidden from search) but not deleted.

## Testing

- **Framework:** Vitest with `@testing-library/react` for component tests
- `npm run test` — Run all tests (from `/frontend`)
- `npm run test:watch` — Run tests in watch mode
- `npm run test:coverage` — Run tests with coverage report

### Test Workflow (IMPORTANT)

Claude must maintain a strong, passing test suite at all times. Follow this workflow:

1. **Before writing implementation code**, write or update tests that define the expected behavior.
2. **After completing a feature or change**, run `npm run test` and confirm all tests pass before moving on.
3. **If a test fails**, fix the implementation (not the test) unless the test itself has a bug or the requirements changed.
4. **If requirements change**, ask the user for clarification, then update tests to match the new requirements before updating implementation.
5. **Never delete or skip a failing test to make the suite pass.** If a test needs to change, explain why.

### What to Test

- **Unit tests (required):** Haversine distance calculation, relevance scoring algorithm, Zod validation schemas, edit token generation, any pure utility functions
- **Lambda handler tests (required):** All CRUD handlers — creation, retrieval, update, token validation, error cases (invalid token, missing fields, malformed data). Mock DynamoDB calls using `aws-sdk-client-mock`.
- **API integration tests (required):** Request/response shapes, status codes, CORS behavior
- **Component tests (where valuable):** Form validation behavior, conditional rendering based on pace data. Don't test simple layout/styling.

### Test File Conventions

- Test files live next to the code they test: `haversine.ts` -> `haversine.test.ts`
- Lambda handler tests: `/lambda/runs/__tests__/create.test.ts`, etc.
- Use descriptive test names: `it("returns 403 when edit token is invalid")` not `it("handles bad token")`
- Use `describe` blocks to group related tests by feature or endpoint

## Git Workflow

- Commit directly to `main` (solo project, no branches needed).
- Use conventional commit messages: `feat:`, `fix:`, `chore:`, `test:`, `docs:`, `infra:`
- The `infra:` prefix is used for CDK and infrastructure changes.
- **Commit after completing each major piece of work** — a working feature, a passing test suite addition, a CDK stack, etc. Don't let work accumulate uncommitted.
- **Before every commit:** run `npm run typecheck && npm run lint && npm run test` (in `/frontend`) and confirm all pass. Do not commit with failing checks.
- Write clear commit messages that describe what changed and why. Examples:
  - `feat: add run creation Lambda with Zod validation and edit token generation`
  - `test: add handler tests for GET /runs with DynamoDB mocking`
  - `fix: correct haversine formula to return miles instead of kilometers`
  - `infra: add DynamoDB table with GSI for active runs by day`
  - `chore: add Nominatim geocoding proxy Lambda`

## Environment Variables

### Frontend (`.env.local`)

```
NEXT_PUBLIC_API_URL=         # API Gateway endpoint URL
NEXT_PUBLIC_APP_URL=         # Base URL of the deployed app (for generating edit links)
```

### Lambda (set via CDK environment, not `.env` files)

```
TABLE_NAME=                  # DynamoDB table name (injected by CDK)
AWS_REGION=                  # AWS region (set automatically by Lambda runtime)
```

No paid API keys are needed. The entire stack uses free-tier services.

## Brand & Visual Style

The app follows the MCRRC brand identity from mcrrc.org. The tagline is **"A Place For Every Pace"**.

### Brand Colors (from mcrrc.org)

| Role | Hex | CSS Variable | Tailwind Class |
|------|-----|-------------|----------------|
| Primary dark (nav, header bg) | `#0D0D3B` | `--brand-navy` | `brand-navy` |
| Accent purple (Join Us, key CTAs) | `#402277` | `--brand-purple` | `brand-purple` |
| Accent orange (secondary CTA, highlights) | `#E97E12` | `--brand-orange` | `brand-orange` |
| Light background | `#f2f5f7` | `--brand-gray` | `brand-gray` |
| Body text | `#333333` | `--foreground` | `foreground` |
| White | `#ffffff` | `--background` | `background` |

### Color Usage Rules

- **Primary buttons and CTAs** (selected pace pills, Submit Run, main actions): Use `brand-purple`. This matches the "Join Us" button on mcrrc.org.
- **Secondary accents and highlights** (terrain badges, hover states, the "Add a Run" link, emphasis): Use `brand-orange`.
- **Nav and header backgrounds**: Use `brand-navy` (very dark, nearly black).
- **Text links**: Use `brand-purple` default, `brand-orange` on hover.
- **Secondary text** (labels, helper text, muted info): Use Tailwind `gray-500` or `gray-600`.
- **Light backgrounds** (card areas, bottom sheet, search bar): Use `brand-gray` or white.
- **Semantic colors** (pace match indicators): Keep standard Tailwind green/yellow/gray — these are informational, not brand-specific.
- **Never use default Tailwind blue** (`blue-500`, `blue-600`, etc.) for interactive elements. Always use the custom brand colors above.
- The app has no dark mode. MCRRC's site does not use dark mode.

### Home Page Layout

The home page uses a **layered layout** (Google Maps-style):

- **Layer 0:** `layout.tsx` header — still rendered but hidden behind the fixed map
- **Layer 1:** Full-screen Leaflet map (`position: fixed; inset: 0; z-index: 0`)
- **Layer 2:** Floating search bar (`position: fixed; top; z-index: 20`) — collapsible pill that expands to show LocationSearch + PaceSelector
- **Layer 3:** Draggable bottom sheet (`position: fixed; bottom; z-index: 10`) — three snap points: collapsed (70px peek), half (50vh), full (100vh - 40px)
- **Layer 4:** Floating "Add a Run" button (`position: fixed; top-right; z-index: 20`)

Other pages (`/runs/new`, `/runs/[id]`, `/runs/[id]/edit`) use standard flow layout — the `layout.tsx` header remains visible.

## Important Rules

- NEVER install or use Google Maps. Use Leaflet + OpenStreetMap only.
- NEVER add authentication libraries (NextAuth, Clerk, etc.). Auth is just the edit token.
- NEVER use `WidthType.PERCENTAGE` or any paid API services.
- All data fetching for the map/seeker view happens via API Gateway. The frontend calls the REST API, and ranking/sorting is computed client-side.
- Every form must work well on mobile. Inputs should be large enough to tap. Use native date/time pickers where possible.
- When creating the "edit link shown after run creation" UI, make it extremely prominent and clear. This is the most critical UX moment — if the organizer loses this link, they lose edit access.
- **Lambda handlers must be stateless.** No global mutable state, no in-memory caches between invocations.
- **Minimize cold start impact.** Keep Lambda bundles small. Use tree-shaking. Lazy-load heavy dependencies only when needed.
- **Never hardcode AWS resource names** (table names, API URLs) in Lambda code. Always read from environment variables.

## Infrastructure Conventions

### CDK Patterns

- All CDK code lives in `/infra/`. The entry point is `/infra/bin/app.ts`.
- Use **separate stacks** for logically distinct resources: `DatabaseStack`, `ApiStack`, `FrontendStack`.
- Stack outputs (e.g., API Gateway URL, table name) are exported using `CfnOutput` for cross-stack references.
- Use `cdk.RemovalPolicy.DESTROY` for dev resources to allow clean teardown. Switch to `RETAIN` for production.

### Naming

- Stack names: `McrrcDropInRuns-<StackName>` (e.g., `McrrcDropInRuns-Database`, `McrrcDropInRuns-Api`)
- Lambda function names: `mcrrc-<handler>` (e.g., `mcrrc-create-run`, `mcrrc-list-runs`)
- DynamoDB table name: `mcrrc-drop-in-runs`

### Lambda Bundling

- Use `NodejsFunction` from `aws-cdk-lib/aws-lambda-nodejs` for automatic esbuild bundling and tree-shaking.
- Set `runtime: lambda.Runtime.NODEJS_20_X`.
- Set `handler: 'handler'` (each file exports a `handler` function).
- Pass environment variables (table name, etc.) via the `environment` property on `NodejsFunction`.

### Frontend Hosting (AWS Amplify)

- The Next.js frontend is hosted on AWS Amplify Hosting, which natively supports Next.js (SSR, API routes, ISR, etc.) without needing static export.
- Amplify connects to the GitHub repo and auto-deploys on push to `main`.
- Environment variables (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL`) are configured in the Amplify Console.
- The `FrontendStack` CDK stack can optionally manage the Amplify app resource via `@aws-cdk/aws-amplify-alpha` or the app can be created directly in the Amplify Console.
- NEVER use Vercel for hosting. The entire stack must remain on AWS.

### DynamoDB in CDK

- Define the table in `DatabaseStack` with `billingMode: BillingMode.PAY_PER_REQUEST` (on-demand, no capacity planning needed).
- Define GSIs inline in the table construct.
- Grant Lambda functions read/write access via `table.grantReadWriteData(fn)`.
