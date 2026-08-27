#!/bin/sh
set -e

echo "🚀 Running database migrations and seeds..."
npx prisma db push --skip-generate || true
npx tsx prisma/seed.ts || true

echo "✨ Starting WhatsPulse App..."
exec "$@"
