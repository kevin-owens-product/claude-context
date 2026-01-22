#!/bin/bash
# Post-edit hook for Claude Code
# Runs after file edits to validate and learn

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LEARNING_DIR="$SCRIPT_DIR/../learning"

# Get the edited file from argument
EDITED_FILE="$1"

if [ -z "$EDITED_FILE" ]; then
    exit 0
fi

echo "🔄 Post-edit validation for: $EDITED_FILE"

# 1. Run incremental TypeScript check
if [[ "$EDITED_FILE" =~ \.(ts|tsx)$ ]]; then
    echo "  📝 Running TypeScript validation..."
    cd "$PROJECT_ROOT"

    # Quick syntax check using TypeScript compiler
    if npx tsc --noEmit --skipLibCheck "$EDITED_FILE" 2>/dev/null; then
        echo "  ✅ TypeScript syntax valid"
    else
        echo "  ⚠️ TypeScript errors in edited file"

        # Log the error for learning
        ERROR_LOG="$LEARNING_DIR/recent-errors.log"
        echo "[$(date -Iseconds)] TypeScript error in $EDITED_FILE" >> "$ERROR_LOG"
    fi
fi

# 2. Auto-format check
if [[ "$EDITED_FILE" =~ \.(ts|tsx|js|jsx|json)$ ]]; then
    echo "  🎨 Checking format..."
    if command -v prettier &> /dev/null; then
        if npx prettier --check "$EDITED_FILE" 2>/dev/null; then
            echo "  ✅ Format valid"
        else
            echo "  ℹ️ File could be formatted with prettier"
        fi
    fi
fi

# 3. Update file modification tracking
MODIFIED_LOG="$LEARNING_DIR/modified-files.log"
echo "$EDITED_FILE|$(date -Iseconds)" >> "$MODIFIED_LOG" 2>/dev/null || true

echo "✅ Post-edit validation complete"
