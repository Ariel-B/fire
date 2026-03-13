#!/bin/bash

# FIRE Planning Tool - Setup Script
# Initializes the development environment for testing

set -e

echo "🔧 FIRE Planning Tool - Setup"
echo "=============================="
echo ""

# Check for required tools
echo "Checking prerequisites..."

if ! command -v dotnet &> /dev/null; then
    echo "❌ dotnet not found. Please install .NET SDK"
    exit 1
fi
echo "✅ dotnet $(dotnet --version)"

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js"
    exit 1
fi
echo "✅ Node.js $(node --version)"

if ! command -v npm &> /dev/null; then
    echo "❌ npm not found. Please install npm"
    exit 1
fi
echo "✅ npm $(npm --version)"

echo ""
echo "Installing dependencies..."

# Install npm packages
echo "📦 Installing npm packages..."
npm install

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  Run tests:        make test"
echo "  View help:        make help"
echo "  Backend only:     make test-backend"
echo "  Frontend only:    make test-frontend"
echo "  With coverage:    make test-coverage"
echo ""
