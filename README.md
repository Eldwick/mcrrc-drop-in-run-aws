# MCRRC Run Finder

A web app that helps [Montgomery County Road Runners Club](https://mcrrc.org) members discover weekly drop-in group runs by location and pace. Runners enter where they are and how fast they run; the app shows them the best matches on a map. Run organizers can list and manage their runs without creating an account.

## How It Works

- **Seekers** enter a location and pace range. The app ranks all active runs by a relevance score combining pace match (60%) and proximity (40%), displayed on a full-screen Leaflet map with a draggable bottom sheet.
- **Organizers** fill out a form to list a run. On creation they receive a secret edit link (URL with token) — no accounts needed. Anyone with the link can edit or deactivate the listing.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router), TypeScript |
| Styling | Tailwind CSS (mobile-first) |
| Map | Leaflet + React-Leaflet + OpenStreetMap |
| Geocoding | Nominatim (OpenStreetMap) |
| Database | Amazon DynamoDB (single-table design) |
| Backend | AWS Lambda (Node.js 20, TypeScript) |
| API | Amazon API Gateway (REST) |
| IaC | AWS CDK (TypeScript) |
| Hosting | AWS Amplify (frontend), API Gateway + Lambda (backend) |
| Testing | Vitest + Testing Library |

No paid API keys or services required.

## Project Structure

```
frontend/           # Next.js app (pages, components, hooks, utils)
lambda/             # Lambda handlers and shared utilities
  runs/             # CRUD handlers (create, get, list, update)
  geocode/          # Geocoding proxy handler
  shared/           # DynamoDB client, response helpers, validators
infra/              # AWS CDK stacks (Database, Api, Frontend)
scripts/            # Utility scripts (seed-dynamodb.ts)
docs/               # Product requirements (PRD.md)
```

## Prerequisites

- **Node.js 20+**
- **AWS CLI** configured with credentials (`aws configure`)
- **AWS CDK CLI** (`npm install -g aws-cdk`)

## Getting Started

1. **Clone the repo**

   ```sh
   git clone <repo-url>
   cd aws-mcrrc-drop-in-runs
   ```

2. **Install dependencies**

   ```sh
   cd frontend && npm install && cd ..
   cd lambda && npm install && cd ..
   cd infra && npm install && cd ..
   ```

3. **Configure environment variables**

   ```sh
   cp .env.example frontend/.env.local
   ```

   Edit `frontend/.env.local` and set:
   - `NEXT_PUBLIC_API_URL` — your API Gateway endpoint URL (available after deploy)

4. **Deploy infrastructure**

   ```sh
   cd infra
   npx cdk deploy
   ```

   This creates the DynamoDB table, Lambda functions, and API Gateway. Note the API URL from the stack outputs.

5. **Seed the database**

   ```sh
   npx tsx scripts/seed-dynamodb.ts
   ```

6. **Start the frontend**

   ```sh
   cd frontend
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Available Commands

### Frontend (`/frontend`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint check |
| `npm run typecheck` | TypeScript type checking |
| `npm run test` | Run all Vitest tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |

### Lambda (`/lambda`)

| Command | Description |
|---------|-------------|
| `npm run test` | Run all handler tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run typecheck` | TypeScript type checking |

### Infrastructure (`/infra`)

| Command | Description |
|---------|-------------|
| `npx cdk synth` | Synthesize CloudFormation template |
| `npx cdk deploy` | Deploy all stacks |
| `npx cdk deploy --hotswap` | Fast-deploy Lambda changes (dev only) |
| `npx cdk diff` | Show pending infrastructure changes |
| `npx cdk destroy` | Tear down all stacks |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/runs` | List all active runs |
| `GET` | `/runs/{id}` | Get a single run by ID |
| `POST` | `/runs` | Create a new run (returns edit token) |
| `PUT` | `/runs/{id}?token=` | Update a run (requires edit token) |
| `GET` | `/geocode?q=` | Geocode an address via Nominatim proxy |

## Testing

Run frontend and Lambda tests separately:

```sh
# Frontend tests
cd frontend && npm run test

# Lambda handler tests
cd lambda && npm run test
```

Tests use Vitest with `@testing-library/react` for components and `aws-sdk-client-mock` for DynamoDB mocking.

## Architecture Overview

```
Browser  -->  AWS Amplify Hosting (Next.js)
                    |
                    v
              API Gateway (REST)
                    |
         +----------+----------+
         |          |          |
      Lambda     Lambda     Lambda  ...
      (CRUD)    (geocode)
         |
         v
      DynamoDB
    (single table)
```

- **DynamoDB** uses a single-table design with composite keys (`PK: RUN#<uuid>`, `SK: METADATA`) and a GSI for querying active runs by day.
- **Lambda handlers** are thin — validation via Zod, responses via shared helpers, no in-memory state.
- **Ranking** is computed client-side after fetching all active runs (the dataset is small, ~50 runs max).
- **No authentication** — edit access is controlled by secret URL tokens generated at run creation.

## Contributing

This is a solo project. Commits go directly to `main` using conventional commit prefixes:

```
feat:    New features
fix:     Bug fixes
test:    Test additions/changes
infra:   CDK and infrastructure changes
chore:   Maintenance tasks
docs:    Documentation
```

Before committing, run:

```sh
cd frontend && npm run typecheck && npm run lint && npm run test
```
