#!/bin/sh
set -e

echo "🚀 Running database schema sync..."
if [ -f "./node_modules/.bin/prisma" ]; then
  ./node_modules/.bin/prisma db push --skip-generate --accept-data-loss || true
else
  npx prisma db push --skip-generate --accept-data-loss || true
fi

echo "🌱 Running database seeder..."
if [ -f "./node_modules/.bin/tsx" ]; then
  ./node_modules/.bin/tsx prisma/seed.ts || true
else
  npx tsx prisma/seed.ts || true
fi

echo "✨ Starting WhatsPulse App..."
exec "$@"
