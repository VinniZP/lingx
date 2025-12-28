#!/bin/sh
set -e

echo "Localeflow API Starting..."
echo "Running database migrations..."

# Run Prisma migrations
npx prisma migrate deploy

echo "Migrations complete."
echo "Starting API server..."

# Execute the main command (node dist/index.js)
exec "$@"
