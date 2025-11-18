#!/bin/bash

echo "🎭 Starting Sarcasm Mugs Development Server..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from template..."
    cp .env.example .env
    echo "✅ Created .env file. Please edit it with your credentials:"
    echo "   - PRINTIFY_API_TOKEN"
    echo "   - PRINTIFY_SHOP_ID"
    echo "   - BLOG_API_KEY"
    echo ""
    read -p "Press Enter to continue after editing .env..."
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build Tailwind CSS
echo "🎨 Building Tailwind CSS..."
npm run build:css

# Start server
echo "🚀 Starting server..."
echo "================================================"
echo "Server will be available at: http://localhost:3000"
echo "================================================"
echo ""
npm start
