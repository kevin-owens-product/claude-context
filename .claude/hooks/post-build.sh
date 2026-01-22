#!/bin/bash
# Post-build hook for Claude Code
# Validates build output and generates reports

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
QUALITY_DIR="$SCRIPT_DIR/../quality"
LEARNING_DIR="$SCRIPT_DIR/../learning"

echo "📊 Post-build validation..."

cd "$PROJECT_ROOT"

# Ensure directories exist
mkdir -p "$QUALITY_DIR" "$LEARNING_DIR"

# 1. Verify build outputs exist
echo "🔍 Checking build outputs..."
BUILD_SUCCESS=1

# Check for common build output patterns
for dist_dir in apps/*/dist packages/*/dist; do
    if [ -d "$dist_dir" ]; then
        FILE_COUNT=$(find "$dist_dir" -type f -name "*.js" | wc -l)
        echo "  ✅ $dist_dir: $FILE_COUNT JS files"
    fi
done

# 2. Bundle size analysis
echo "📦 Analyzing bundle sizes..."
BUNDLE_REPORT="$QUALITY_DIR/bundle-report.json"

echo '{"bundles": [' > "$BUNDLE_REPORT"
FIRST=true

for dist_dir in apps/*/dist packages/*/dist; do
    if [ -d "$dist_dir" ]; then
        SIZE=$(du -sb "$dist_dir" 2>/dev/null | cut -f1 || echo "0")
        APP_NAME=$(echo "$dist_dir" | cut -d'/' -f2)

        if [ "$FIRST" = true ]; then
            FIRST=false
        else
            echo ',' >> "$BUNDLE_REPORT"
        fi

        echo "  {\"name\": \"$APP_NAME\", \"size\": $SIZE}" >> "$BUNDLE_REPORT"
        echo "  📊 $APP_NAME: $(numfmt --to=iec $SIZE 2>/dev/null || echo "${SIZE}B")"
    fi
done

echo '],"timestamp": "'$(date -Iseconds)'"}' >> "$BUNDLE_REPORT"

# 3. Check for source maps in production builds
if [ "$NODE_ENV" = "production" ]; then
    echo "🗺️ Checking source maps..."
    SOURCE_MAPS=$(find . -path "*/dist/*.map" -type f 2>/dev/null | wc -l)
    if [ "$SOURCE_MAPS" -gt 0 ]; then
        echo "  ⚠️ Found $SOURCE_MAPS source map files in production build"
    else
        echo "  ✅ No source maps in production build"
    fi
fi

# 4. Run circular dependency check
echo "🔄 Checking for circular dependencies..."
if command -v madge &> /dev/null; then
    CIRCULAR=$(npx madge --circular --extensions ts apps/ packages/ 2>/dev/null | grep -c "Found" || echo "0")
    if [ "$CIRCULAR" = "0" ]; then
        echo "  ✅ No circular dependencies detected"
    else
        echo "  ⚠️ Circular dependencies found"
        npx madge --circular --extensions ts apps/ packages/ 2>/dev/null > "$QUALITY_DIR/circular-deps.txt"
    fi
else
    echo "  ℹ️ madge not installed, skipping circular dep check"
fi

# 5. Generate build metrics
echo "📈 Generating build metrics..."
BUILD_METRICS="$QUALITY_DIR/build-metrics.json"

cat > "$BUILD_METRICS" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "nodeVersion": "$(node -v)",
  "npmVersion": "$(npm -v)",
  "buildStatus": "success",
  "metrics": {
    "totalFiles": $(find apps packages -name "*.ts" -type f 2>/dev/null | wc -l),
    "testFiles": $(find apps packages -name "*.spec.ts" -type f 2>/dev/null | wc -l),
    "configFiles": $(find . -maxdepth 2 -name "*.config.*" -type f 2>/dev/null | wc -l)
  }
}
EOF

echo "  ✅ Build metrics saved to $BUILD_METRICS"

# 6. Log successful build for learning
echo "$(date -Iseconds)|build|success" >> "$LEARNING_DIR/build-history.log"

echo ""
echo "✅ Post-build validation complete"
