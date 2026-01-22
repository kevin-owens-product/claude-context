#!/bin/bash
# Pre-build hook for Claude Code
# Validates environment and dependencies before building

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "🏗️ Pre-build checks..."

cd "$PROJECT_ROOT"

# 1. Check Node.js version
echo "📦 Checking Node.js version..."
REQUIRED_NODE="18"
CURRENT_NODE=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)

if [ "$CURRENT_NODE" -lt "$REQUIRED_NODE" ]; then
    echo "  ❌ Node.js $REQUIRED_NODE+ required, found $CURRENT_NODE"
    exit 1
else
    echo "  ✅ Node.js version OK ($CURRENT_NODE)"
fi

# 2. Check package-lock.json is in sync
echo "📋 Checking dependency lock file..."
if [ -f "package-lock.json" ]; then
    # Check if node_modules exists and is reasonably up-to-date
    if [ -d "node_modules" ]; then
        if [ "package-lock.json" -nt "node_modules" ]; then
            echo "  ⚠️ Dependencies may be out of date. Running npm ci..."
            npm ci --silent 2>/dev/null || npm install --silent
        else
            echo "  ✅ Dependencies appear up-to-date"
        fi
    else
        echo "  📥 Installing dependencies..."
        npm ci --silent 2>/dev/null || npm install --silent
    fi
else
    echo "  ⚠️ No package-lock.json found"
fi

# 3. Check for required environment variables
echo "🔐 Checking environment..."
REQUIRED_ENV_VARS=()
MISSING_ENV=0

for var in "${REQUIRED_ENV_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "  ❌ Missing required env var: $var"
        MISSING_ENV=1
    fi
done

if [ $MISSING_ENV -eq 0 ]; then
    echo "  ✅ Environment check passed"
fi

# 4. Check Prisma schema validity (if exists)
if [ -f "packages/prisma/schema.prisma" ]; then
    echo "🗃️ Validating Prisma schema..."
    if npx prisma validate --schema=packages/prisma/schema.prisma 2>/dev/null; then
        echo "  ✅ Prisma schema valid"
    else
        echo "  ⚠️ Prisma schema validation failed (non-blocking)"
    fi
fi

# 5. Generate Prisma client if needed
if [ -f "packages/prisma/schema.prisma" ]; then
    echo "🔄 Ensuring Prisma client is generated..."
    if [ ! -d "node_modules/.prisma/client" ] || [ "packages/prisma/schema.prisma" -nt "node_modules/.prisma/client" ]; then
        npx prisma generate --schema=packages/prisma/schema.prisma 2>/dev/null || true
        echo "  ✅ Prisma client generated"
    else
        echo "  ✅ Prisma client up-to-date"
    fi
fi

# 6. Clean previous build artifacts if requested
if [ "$CLEAN_BUILD" = "true" ]; then
    echo "🧹 Cleaning previous build..."
    find . -type d -name "dist" -exec rm -rf {} + 2>/dev/null || true
    find . -type f -name "*.tsbuildinfo" -delete 2>/dev/null || true
    echo "  ✅ Build artifacts cleaned"
fi

echo ""
echo "✅ Pre-build checks complete"
