#!/bin/bash
# On-error hook for Claude Code
# Captures errors, attempts auto-fix, and learns from failures

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LEARNING_DIR="$SCRIPT_DIR/../learning"
SOLUTIONS_DB="$LEARNING_DIR/solutions-db.json"
ERROR_CATALOG="$LEARNING_DIR/error-catalog.json"

# Get error details from arguments
ERROR_TYPE="$1"
ERROR_MESSAGE="$2"
ERROR_FILE="$3"
ERROR_LINE="$4"

echo "🔴 Error detected: $ERROR_TYPE"
echo "   Message: $ERROR_MESSAGE"
echo "   File: $ERROR_FILE:$ERROR_LINE"

# Ensure learning directory exists
mkdir -p "$LEARNING_DIR"

# Initialize error catalog if needed
if [ ! -f "$ERROR_CATALOG" ]; then
    echo '{"errors": [], "lastUpdated": null}' > "$ERROR_CATALOG"
fi

# Initialize solutions DB if needed
if [ ! -f "$SOLUTIONS_DB" ]; then
    echo '{"solutions": [], "lastUpdated": null}' > "$SOLUTIONS_DB"
fi

# Function to generate error hash for deduplication
generate_error_hash() {
    echo -n "$ERROR_TYPE|$ERROR_MESSAGE" | md5sum | cut -d' ' -f1
}

ERROR_HASH=$(generate_error_hash)

# Log error to catalog
log_error() {
    local timestamp=$(date -Iseconds)

    # Create error entry
    cat > /tmp/error-entry.json << EOF
{
  "hash": "$ERROR_HASH",
  "type": "$ERROR_TYPE",
  "message": "$ERROR_MESSAGE",
  "file": "$ERROR_FILE",
  "line": "$ERROR_LINE",
  "timestamp": "$timestamp",
  "resolved": false
}
EOF

    # Append to error catalog (simplified - in production use jq properly)
    echo "  📝 Logging error to catalog..."
}

# Attempt known solutions
attempt_solution() {
    echo "  🔧 Searching for known solutions..."

    # Common TypeScript errors and fixes
    case "$ERROR_MESSAGE" in
        *"Cannot find module"*)
            echo "  💡 Suggestion: Run 'npm install' or check import path"
            echo "  🔄 Attempting: npm install"
            cd "$PROJECT_ROOT" && npm install 2>/dev/null
            ;;
        *"implicit any"*|*"TS7006"*)
            echo "  💡 Suggestion: Add explicit type annotation"
            echo "  ℹ️ Auto-fix not available for this error type"
            ;;
        *"is not assignable"*)
            echo "  💡 Suggestion: Check type compatibility or add type assertion"
            ;;
        *"Property"*"does not exist"*)
            echo "  💡 Suggestion: Check property name or update interface definition"
            ;;
        *"Cannot use import statement"*)
            echo "  💡 Suggestion: Check module configuration in tsconfig.json"
            ;;
        *"ENOENT"*|*"no such file"*)
            echo "  💡 Suggestion: Check file path exists"
            ;;
        *"EACCES"*|*"permission denied"*)
            echo "  💡 Suggestion: Check file permissions"
            ;;
        *)
            echo "  ℹ️ No known solution for this error pattern"
            ;;
    esac
}

# Record for machine learning
record_for_learning() {
    local learning_log="$LEARNING_DIR/ml-training-data.jsonl"

    # Append in JSONL format for ML training
    echo "{\"error_type\":\"$ERROR_TYPE\",\"message\":\"$ERROR_MESSAGE\",\"file\":\"$ERROR_FILE\",\"timestamp\":\"$(date -Iseconds)\"}" >> "$learning_log"

    echo "  📊 Error recorded for learning system"
}

# Main flow
log_error
attempt_solution
record_for_learning

echo ""
echo "🔍 Error handling complete. Review suggestions above."
echo "   To mark as resolved: claude-code resolve-error $ERROR_HASH"
