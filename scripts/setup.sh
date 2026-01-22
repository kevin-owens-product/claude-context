#!/bin/bash
set -e

echo "=== Claude Context Setup ==="
echo ""

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo "Error: Node.js 20+ required (found v$NODE_VERSION)"
  exit 1
fi
echo "✓ Node.js version OK"

# Check pnpm
if ! command -v pnpm &> /dev/null; then
  echo "Installing pnpm..."
  npm install -g pnpm
fi
echo "✓ pnpm available"

# Install dependencies
echo ""
echo "Installing dependencies..."
pnpm install

# Copy environment file
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✓ Created .env from template"
fi

if [ ! -f apps/api/.env ]; then
  cp apps/api/.env.example apps/api/.env
  echo "✓ Created apps/api/.env from template"
fi

# Generate Prisma client
echo ""
echo "Generating Prisma client..."
pnpm --filter @forge/prisma generate

# Build packages
echo ""
echo "Building packages..."
pnpm --filter @forge/context build

# Typecheck
echo ""
echo "Running typecheck..."
pnpm typecheck || echo "⚠ Some type errors found (see above)"

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "  1. Update .env with your database credentials"
echo "  2. Run 'pnpm db:push' to create database tables"
echo "  3. Run 'pnpm dev' to start development servers"
echo ""
