#!/usr/bin/env bash
#
# deploy-amplify.sh — One-time setup for AWS Amplify Hosting
#
# Creates the Amplify app, IAM compute role, connects GitHub, creates the
# main branch, and triggers the first deployment.
#
# Usage:
#   ./scripts/deploy-amplify.sh <github-personal-access-token>
#
# Prerequisites:
#   - AWS CLI v2 installed and configured
#   - AWS_PROFILE=personal (or set your profile below)
#   - GitHub personal access token with repo scope
#
set -euo pipefail

# --- Configuration ---
AWS_PROFILE="${AWS_PROFILE:-personal}"
AWS_REGION="us-east-1"
APP_NAME="mcrrc-run-finder"
REPO_URL="https://github.com/Eldwick/mcrrc-drop-in-run-aws"
BRANCH="main"
API_URL="https://z83bqa6zff.execute-api.us-east-1.amazonaws.com/prod"
ROLE_NAME="amplify-compute-${APP_NAME}"

export AWS_PROFILE
export AWS_DEFAULT_REGION="${AWS_REGION}"

# --- Validate arguments ---
if [ $# -lt 1 ]; then
  echo "Usage: $0 <github-personal-access-token>"
  echo ""
  echo "Generate a token at: https://github.com/settings/tokens"
  echo "Required scope: repo (full control of private repositories)"
  exit 1
fi

GITHUB_TOKEN="$1"

echo "=== Creating Amplify app: ${APP_NAME} ==="

APP_ID=$(aws amplify create-app \
  --name "${APP_NAME}" \
  --repository "${REPO_URL}" \
  --access-token "${GITHUB_TOKEN}" \
  --platform "WEB_COMPUTE" \
  --environment-variables "NEXT_PUBLIC_API_URL=${API_URL},AMPLIFY_MONOREPO_APP_ROOT=frontend" \
  --query 'app.appId' \
  --output text)

echo "App created: ${APP_ID}"

echo ""
echo "=== Creating IAM compute role: ${ROLE_NAME} ==="

TRUST_POLICY=$(cat <<'POLICY'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "amplify.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
POLICY
)

ROLE_ARN=$(aws iam create-role \
  --role-name "${ROLE_NAME}" \
  --assume-role-policy-document "${TRUST_POLICY}" \
  --query 'Role.Arn' \
  --output text)

echo "Role created: ${ROLE_ARN}"

aws iam attach-role-policy \
  --role-name "${ROLE_NAME}" \
  --policy-arn "arn:aws:iam::aws:policy/service-role/AmplifyBackendDeployFullAccess"

echo "Policy attached: AmplifyBackendDeployFullAccess"

# Brief pause for IAM propagation
echo "Waiting for IAM role propagation..."
sleep 10

echo ""
echo "=== Attaching compute role to Amplify app ==="

aws amplify update-app \
  --app-id "${APP_ID}" \
  --iam-service-role-arn "${ROLE_ARN}" \
  --query 'app.appId' \
  --output text > /dev/null

echo "Compute role attached."

echo ""
echo "=== Creating branch: ${BRANCH} ==="

aws amplify create-branch \
  --app-id "${APP_ID}" \
  --branch-name "${BRANCH}" \
  --stage "PRODUCTION" \
  --framework "Next.js - SSR" \
  --enable-auto-build \
  --query 'branch.branchName' \
  --output text > /dev/null

echo "Branch created: ${BRANCH} (auto-build enabled)"

echo ""
echo "=== Triggering first deployment ==="

JOB_ID=$(aws amplify start-job \
  --app-id "${APP_ID}" \
  --branch-name "${BRANCH}" \
  --job-type "RELEASE" \
  --query 'jobSummary.jobId' \
  --output text)

echo "Build triggered: Job ${JOB_ID}"

echo ""
echo "==========================================="
echo "  Amplify app deployed successfully!"
echo "==========================================="
echo ""
echo "  App ID:     ${APP_ID}"
echo "  App URL:    https://${BRANCH}.${APP_ID}.amplifyapp.com"
echo "  Console:    https://${AWS_REGION}.console.aws.amazon.com/amplify/home#/${APP_ID}"
echo "  Build log:  https://${AWS_REGION}.console.aws.amazon.com/amplify/home#/${APP_ID}/${BRANCH}/${JOB_ID}"
echo ""
echo "  Check build status:"
echo "    aws amplify get-job --app-id ${APP_ID} --branch-name ${BRANCH} --job-id ${JOB_ID} --query 'job.summary.status' --output text"
echo ""
echo "  Environment variables are set in the Amplify app."
echo "  To update them later:"
echo "    aws amplify update-app --app-id ${APP_ID} --environment-variables NEXT_PUBLIC_API_URL=<new-url>"
echo ""
