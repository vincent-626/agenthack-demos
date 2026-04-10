#!/bin/bash
set -e

DEMO_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🔍 VulnLens Setup"
echo "================="

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip install -r "$DEMO_DIR/backend/requirements.txt" -q

# Install and build frontend
echo "📦 Installing frontend dependencies..."
cd "$DEMO_DIR/frontend"
npm install --silent

echo "🔨 Building frontend..."
npm run build --silent

# Start the server
cd "$DEMO_DIR/backend"
echo ""
echo "✅ Starting VulnLens at http://localhost:8000"
echo ""
if [ -n "$ANTHROPIC_API_KEY" ]; then
    echo "   AI review: ENABLED (Anthropic API key found)"
else
    echo "   AI review: DISABLED (set ANTHROPIC_API_KEY to enable)"
fi
echo ""

python main.py
