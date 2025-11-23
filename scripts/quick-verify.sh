#!/bin/bash
# Quick verification script - pass API key as argument
# Usage: ./scripts/quick-verify.sh YOUR_API_KEY

if [ -z "$1" ]; then
  echo "❌ No API key provided"
  echo ""
  echo "Usage: ./scripts/quick-verify.sh YOUR_API_KEY"
  echo ""
  echo "Or run with environment variable:"
  echo "GEMINI_API_KEY=your-key ./scripts/quick-verify.sh"
  exit 1
fi

export GEMINI_API_KEY="$1"

echo "🔍 Running verification with provided API key..."
echo ""

npx ts-node scripts/verify-veo-setup.ts
