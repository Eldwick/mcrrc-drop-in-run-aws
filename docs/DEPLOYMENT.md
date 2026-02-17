# Deployment Guide — AWS Amplify Hosting

The MCRRC Run Finder frontend is deployed to AWS Amplify Hosting with SSR support (`WEB_COMPUTE` platform). Amplify connects to the GitHub repo and auto-deploys on every push to `main`.

## Prerequisites

- **AWS CLI v2** installed and configured (`aws --version`)
- **AWS profile** set up (the scripts default to `AWS_PROFILE=personal` — adjust as needed)
- **GitHub personal access token** with `repo` scope — [generate one here](https://github.com/settings/tokens)
- Backend already deployed (API Gateway + Lambda + DynamoDB via CDK)

## First-Time Setup

Run the deploy script from the repo root:

```bash
./scripts/deploy-amplify.sh <your-github-personal-access-token>
```

This script:

1. Creates the Amplify app with `WEB_COMPUTE` platform (SSR)
2. Sets `NEXT_PUBLIC_API_URL` as an environment variable
3. Creates an IAM compute role (`amplify-compute-mcrrc-run-finder`) and attaches it
4. Creates the `main` branch with auto-build enabled and `PRODUCTION` stage
5. Triggers the first deployment
6. Prints the app URL, console link, and build log link

After the script completes, the first build will be running. Check its status with the command printed at the end.

## How Auto-Deploy Works

Once the Amplify app is connected to GitHub:

- Every push to `main` automatically triggers a new build and deployment
- Amplify uses `amplify.yml` in the repo root as the build specification
- The build runs `npm ci`, `npm run build`, then the symlink workaround script
- Build artifacts from `.next/` are deployed to Amplify's compute layer

## Manually Trigger a Deployment

```bash
# Get your app ID
APP_ID=$(aws amplify list-apps --query 'apps[?name==`mcrrc-run-finder`].appId' --output text)

# Trigger a release
aws amplify start-job --app-id "$APP_ID" --branch-name main --job-type RELEASE
```

## Check Build Status

```bash
APP_ID=$(aws amplify list-apps --query 'apps[?name==`mcrrc-run-finder`].appId' --output text)

# List recent jobs
aws amplify list-jobs --app-id "$APP_ID" --branch-name main --query 'jobSummaries[0:3].[jobId,status,commitMessage]' --output table

# Check a specific job
aws amplify get-job --app-id "$APP_ID" --branch-name main --job-id <JOB_ID> --query 'job.summary.status' --output text
```

## Environment Variables

| Variable | Value | Set By |
|----------|-------|--------|
| `NEXT_PUBLIC_API_URL` | API Gateway prod endpoint URL | `deploy-amplify.sh` (or Amplify Console) |

To update environment variables after initial setup:

```bash
aws amplify update-app --app-id "$APP_ID" --environment-variables NEXT_PUBLIC_API_URL=<new-url>
```

Note: `NEXT_PUBLIC_APP_URL` is **not needed** — the frontend uses `window.location.origin` for generating edit links, so it automatically picks up the correct Amplify domain.

## Build Specification

The build is configured by `amplify.yml` at the repo root:

- **`appRoot: frontend`** — tells Amplify this is a monorepo and the Next.js app lives in `frontend/`
- **`npm ci`** — clean install of dependencies
- **`npm run build`** — runs `next build`
- **`node ../scripts/resolve-amplify-symlinks.cjs`** — resolves Turbopack symlinks (see Troubleshooting)
- **Cache** — `node_modules/` and `.next/cache/` are cached between builds

## Troubleshooting

### Build fails with symlink errors

Next.js 16.x uses Turbopack, which creates symlinks in `.next/node_modules/` that Amplify's bundler can't follow. The `resolve-amplify-symlinks.cjs` post-build script handles this automatically. If it fails:

1. **Check the build logs** in the Amplify Console for the specific error
2. **Fallback: disable Turbopack** — add `TURBOPACK=0` to the Amplify environment variables
3. **Fallback: pin Next.js 15** — downgrade `next` to latest 15.x in `frontend/package.json`

See [aws-amplify/amplify-hosting#4074](https://github.com/aws-amplify/amplify-hosting/issues/4074) for the upstream issue.

### SSR pages return errors

- Verify `NEXT_PUBLIC_API_URL` is set correctly in Amplify environment variables
- Check that the API Gateway endpoint is accessible (not blocked by CORS or IAM)
- Check the Amplify compute logs in CloudWatch (Amplify creates a log group automatically)

### API calls fail (CORS, 403, etc.)

- The frontend proxies `/api/*` to API Gateway via Next.js rewrites (`next.config.ts`). This works with Amplify's SSR compute.
- If direct browser requests to API Gateway fail, check CORS configuration on the API Gateway stage.

### Auto-build not triggering

- Verify the GitHub webhook is active: check the repo's Settings > Webhooks
- Verify the branch has `--enable-auto-build` set
- Check that the GitHub access token hasn't expired

## Tear Down

To completely remove the Amplify app and IAM role:

```bash
APP_ID=$(aws amplify list-apps --query 'apps[?name==`mcrrc-run-finder`].appId' --output text)

# Delete the Amplify app (removes all branches and deployments)
aws amplify delete-app --app-id "$APP_ID"

# Detach policy and delete IAM role
aws iam detach-role-policy \
  --role-name amplify-compute-mcrrc-run-finder \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmplifyBackendDeployFullAccess

aws iam delete-role --role-name amplify-compute-mcrrc-run-finder
```

This does **not** affect the backend (API Gateway, Lambda, DynamoDB) — those are managed by CDK separately.
