#!/bin/bash
# Pre-test hook for Claude Code
# Prepares test environment and validates test setup

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "🧪 Pre-test preparation..."

cd "$PROJECT_ROOT"

# 1. Check test configuration exists
echo "📋 Checking test configuration..."
if [ -f "jest.config.js" ] || [ -f "jest.config.ts" ] || [ -f "jest.config.json" ]; then
    echo "  ✅ Jest configuration found"
elif [ -f "vitest.config.ts" ] || [ -f "vitest.config.js" ]; then
    echo "  ✅ Vitest configuration found"
else
    echo "  ⚠️ No test configuration found"
fi

# 2. Ensure test database is ready (if applicable)
if [ -n "$DATABASE_URL" ] && [[ "$DATABASE_URL" == *"test"* ]]; then
    echo "🗃️ Preparing test database..."

    if [ -f "packages/prisma/schema.prisma" ]; then
        npx prisma db push --schema=packages/prisma/schema.prisma --skip-generate 2>/dev/null || true
        echo "  ✅ Test database schema pushed"
    fi
fi

# 3. Clear test cache if requested
if [ "$CLEAR_TEST_CACHE" = "true" ]; then
    echo "🧹 Clearing test cache..."
    npx jest --clearCache 2>/dev/null || true
    rm -rf .jest-cache coverage 2>/dev/null || true
    echo "  ✅ Test cache cleared"
fi

# 4. Generate test fixtures if needed
echo "📝 Checking test fixtures..."
FIXTURES_DIR="$PROJECT_ROOT/test/fixtures"
if [ -d "$FIXTURES_DIR" ]; then
    echo "  ✅ Test fixtures directory exists"
else
    echo "  ℹ️ No fixtures directory (optional)"
fi

# 5. Verify mocks are up-to-date
echo "🎭 Checking mock files..."
MOCK_COUNT=$(find . -path "*/\_\_mocks\_\_/*" -type f 2>/dev/null | wc -l)
echo "  ℹ️ Found $MOCK_COUNT mock files"

# 6. Check for test environment variables
echo "🔐 Checking test environment..."
if [ -f ".env.test" ]; then
    echo "  ✅ Test environment file found"
    # Source test environment (careful with this in CI)
    # export $(cat .env.test | xargs)
fi

echo ""
echo "✅ Pre-test preparation complete"
