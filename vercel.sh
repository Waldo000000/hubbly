#!/bin/bash

#
# Vercel Build Adapter Script
#
# This is the ONLY file that should know about VERCEL_ENV.
# It routes to the appropriate npm script based on environment.
#
# Why this exists:
# - Keeps package.json scripts platform-agnostic
# - Centralizes Vercel-specific logic in one place
# - Makes it easy to migrate to other platforms (just delete this file)
#
# Reference: https://vercel.com/kb/guide/per-environment-and-per-branch-build-commands
#

echo "🔍 [Vercel Build] Environment: VERCEL_ENV=$VERCEL_ENV"

# Route to appropriate build script based on environment
if [ "$VERCEL_ENV" == "production" ]; then
  echo "🚀 [Vercel Build] Running production build (migrate + build)..."
  npm run build:production

elif [ "$VERCEL_ENV" == "preview" ]; then
  echo "🔄 [Vercel Build] Running preview build (reset + seed + build)..."
  npm run build:preview

else
  echo "⚠️  [Vercel Build] Unknown VERCEL_ENV='$VERCEL_ENV', defaulting to production build..."
  npm run build:production
fi
