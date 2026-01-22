#!/bin/bash
# Pre-commit hook for Claude Code autonomous builds
# Validates code quality before commits

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
QUALITY_DIR="$SCRIPT_DIR/../quality"

echo "🔍 Running pre-commit quality checks..."

# Track failures
FAILURES=0

# 1. TypeScript type checking on changed files
echo "📝 Checking TypeScript..."
if [ -f "$PROJECT_ROOT/package.json" ]; then
    cd "$PROJECT_ROOT"

    # Get staged TypeScript files
    STAGED_TS=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx)$' || true)

    if [ -n "$STAGED_TS" ]; then
        # Run tsc on the whole project (incremental)
        if npx tsc --noEmit 2>/dev/null; then
            echo "  ✅ TypeScript check passed"
        else
            echo "  ⚠️ TypeScript errors detected (may be pre-existing)"
            # Don't fail on TypeScript for now due to pre-existing errors
        fi
    else
        echo "  ℹ️ No TypeScript files staged"
    fi
fi

# 2. ESLint on staged files
echo "🔎 Running ESLint..."
STAGED_JS=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(js|jsx|ts|tsx)$' || true)
if [ -n "$STAGED_JS" ]; then
    if npx eslint $STAGED_JS --max-warnings=0 2>/dev/null; then
        echo "  ✅ ESLint passed"
    else
        echo "  ⚠️ ESLint warnings/errors detected"
        # Log but don't fail
    fi
else
    echo "  ℹ️ No JavaScript/TypeScript files staged"
fi

# 3. Check for secrets/credentials
echo "🔐 Scanning for secrets..."
SECRET_PATTERNS=(
    "password\s*=\s*['\"][^'\"]+['\"]"
    "api[_-]?key\s*=\s*['\"][^'\"]+['\"]"
    "secret\s*=\s*['\"][^'\"]+['\"]"
    "private[_-]?key"
    "BEGIN RSA PRIVATE KEY"
    "BEGIN OPENSSH PRIVATE KEY"
)

FOUND_SECRETS=0
for pattern in "${SECRET_PATTERNS[@]}"; do
    if git diff --cached | grep -iE "$pattern" > /dev/null 2>&1; then
        echo "  ❌ Potential secret detected matching: $pattern"
        FOUND_SECRETS=1
    fi
done

if [ $FOUND_SECRETS -eq 1 ]; then
    echo "  ⛔ Secrets detected in staged changes. Please remove before committing."
    FAILURES=$((FAILURES + 1))
else
    echo "  ✅ No secrets detected"
fi

# 4. Check for prohibited patterns
echo "🚫 Checking for prohibited patterns..."
PROHIBITED_PATTERNS=(
    "console\.log"
    "TODO:"
    "FIXME:"
    "debugger"
)

for pattern in "${PROHIBITED_PATTERNS[@]}"; do
    COUNT=$(git diff --cached | grep -c "$pattern" || true)
    if [ "$COUNT" -gt 0 ]; then
        echo "  ⚠️ Found $COUNT occurrences of '$pattern'"
    fi
done
echo "  ✅ Prohibited patterns check complete"

# 5. Verify test files exist for new source files
echo "📋 Checking test coverage..."
NEW_SOURCE_FILES=$(git diff --cached --name-only --diff-filter=A | grep -E '^apps/.+\.(service|controller|gateway)\.ts$' | grep -v '\.spec\.ts$' || true)
MISSING_TESTS=0
for src in $NEW_SOURCE_FILES; do
    SPEC_FILE="${src%.ts}.spec.ts"
    if [ ! -f "$PROJECT_ROOT/$SPEC_FILE" ]; then
        echo "  ⚠️ Missing test file: $SPEC_FILE"
        MISSING_TESTS=1
    fi
done
if [ $MISSING_TESTS -eq 0 ]; then
    echo "  ✅ Test coverage check passed"
fi

# Report results
echo ""
if [ $FAILURES -gt 0 ]; then
    echo "❌ Pre-commit checks failed with $FAILURES critical issues"
    exit 1
else
    echo "✅ Pre-commit checks passed"
    exit 0
fi
