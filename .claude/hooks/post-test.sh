#!/bin/bash
# Post-test hook for Claude Code
# Analyzes test results and generates coverage reports

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
QUALITY_DIR="$SCRIPT_DIR/../quality"
LEARNING_DIR="$SCRIPT_DIR/../learning"

echo "📊 Post-test analysis..."

cd "$PROJECT_ROOT"

# Ensure directories exist
mkdir -p "$QUALITY_DIR" "$LEARNING_DIR"

# Get test exit code from argument or assume success
TEST_EXIT_CODE="${1:-0}"

# 1. Parse test results
echo "🔍 Analyzing test results..."
if [ -f "coverage/coverage-summary.json" ]; then
    echo "  ✅ Coverage report found"

    # Extract coverage metrics
    if command -v jq &> /dev/null; then
        LINES_PCT=$(jq '.total.lines.pct' coverage/coverage-summary.json 2>/dev/null || echo "N/A")
        BRANCHES_PCT=$(jq '.total.branches.pct' coverage/coverage-summary.json 2>/dev/null || echo "N/A")
        FUNCTIONS_PCT=$(jq '.total.functions.pct' coverage/coverage-summary.json 2>/dev/null || echo "N/A")

        echo "  📈 Line coverage: $LINES_PCT%"
        echo "  📈 Branch coverage: $BRANCHES_PCT%"
        echo "  📈 Function coverage: $FUNCTIONS_PCT%"

        # Check coverage threshold
        THRESHOLD=80
        if [ "$LINES_PCT" != "N/A" ]; then
            LINES_INT=${LINES_PCT%.*}
            if [ "$LINES_INT" -lt "$THRESHOLD" ]; then
                echo "  ⚠️ Coverage below ${THRESHOLD}% threshold"
            else
                echo "  ✅ Coverage meets threshold"
            fi
        fi
    fi
else
    echo "  ℹ️ No coverage report found"
fi

# 2. Check for flaky tests
echo "🎲 Checking for flaky tests..."
FLAKY_LOG="$QUALITY_DIR/flaky-tests.log"
if [ -f "test-results.json" ]; then
    # Look for tests that have failed intermittently
    grep -l "retry" test-results.json > /dev/null 2>&1 && echo "  ⚠️ Potential flaky tests detected"
fi

# 3. Generate test metrics
echo "📝 Generating test metrics..."
TEST_METRICS="$QUALITY_DIR/test-metrics.json"

# Count test files
SPEC_COUNT=$(find apps packages -name "*.spec.ts" -type f 2>/dev/null | wc -l)
TEST_COUNT=$(find apps packages -name "*.test.ts" -type f 2>/dev/null | wc -l)
TOTAL_TESTS=$((SPEC_COUNT + TEST_COUNT))

cat > "$TEST_METRICS" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "exitCode": $TEST_EXIT_CODE,
  "status": "$([ $TEST_EXIT_CODE -eq 0 ] && echo 'passed' || echo 'failed')",
  "testFiles": $TOTAL_TESTS,
  "specFiles": $SPEC_COUNT,
  "coverage": {
    "lines": "${LINES_PCT:-N/A}",
    "branches": "${BRANCHES_PCT:-N/A}",
    "functions": "${FUNCTIONS_PCT:-N/A}"
  }
}
EOF

echo "  ✅ Test metrics saved"

# 4. Identify uncovered files
echo "📋 Checking for uncovered files..."
if [ -f "coverage/coverage-summary.json" ] && command -v jq &> /dev/null; then
    UNCOVERED=$(jq -r 'to_entries | .[] | select(.value.lines.pct == 0) | .key' coverage/coverage-summary.json 2>/dev/null | head -5)
    if [ -n "$UNCOVERED" ]; then
        echo "  ⚠️ Files with 0% coverage:"
        echo "$UNCOVERED" | while read file; do
            echo "    - $file"
        done
    fi
fi

# 5. Log test run for learning
echo "$(date -Iseconds)|test|$([ $TEST_EXIT_CODE -eq 0 ] && echo 'pass' || echo 'fail')|$TOTAL_TESTS" >> "$LEARNING_DIR/test-history.log"

# 6. Generate test report summary
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo ""
    echo "✅ All tests passed!"
else
    echo ""
    echo "❌ Some tests failed (exit code: $TEST_EXIT_CODE)"
    echo "   Review test output above for details"
fi

# 7. Suggestions for improvement
echo ""
echo "💡 Suggestions:"
if [ "$TOTAL_TESTS" -lt 10 ]; then
    echo "  - Consider adding more test coverage"
fi
if [ "${LINES_PCT%.*}" -lt 80 ] 2>/dev/null; then
    echo "  - Line coverage is below 80%, consider adding tests for uncovered code"
fi

echo ""
echo "✅ Post-test analysis complete"
