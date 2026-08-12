#!/bin/bash
# Floorish Deployment Script
# Usage: ./scripts/deploy.sh [github|netlify|both]

set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🏠 Floorish Deployment Script${NC}"
echo "=================================="

# Check environment
if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}Error: pnpm is not installed${NC}"
    exit 1
fi

# Install dependencies
echo -e "${GREEN}📦 Installing dependencies...${NC}"
pnpm install --frozen-lockfile

# Run tests
echo -e "${GREEN}🧪 Running tests...${NC}"
pnpm test || { echo -e "${RED}Tests failed!${NC}"; exit 1; }

# Build
echo -e "${GREEN}🔨 Building production...${NC}"
pnpm build

# Check build output
if [ ! -d "build" ]; then
    echo -e "${RED}Build failed — no build directory${NC}"
    exit 1
fi

DEPLOY_TYPE=${1:-both}

# Deploy to GitHub Pages
if [ "$DEPLOY_TYPE" = "github" ] || [ "$DEPLOY_TYPE" = "both" ]; then
    echo -e "${GREEN}🚀 Deploying to GitHub Pages...${NC}"
    
    # Create CNAME if needed
    if [ -n "${CNAME:-}" ]; then
        echo "$CNAME" > build/CNAME
    fi
    
    # Use gh-pages package
    npx gh-pages -d build -m "Deploy: $(git rev-parse --short HEAD) [skip ci]"
    
    echo -e "${GREEN}✅ GitHub Pages deploy complete${NC}"
fi

# Deploy to Netlify
if [ "$DEPLOY_TYPE" = "netlify" ] || [ "$DEPLOY_TYPE" = "both" ]; then
    echo -e "${GREEN}🚀 Deploying to Netlify...${NC}"
    
    if ! command -v netlify &> /dev/null; then
        echo -e "${BLUE}Installing Netlify CLI...${NC}"
        npm install -g netlify-cli
    fi
    
    netlify deploy \
        --dir=build \
        --prod \
        --message="Deploy: $(git rev-parse --short HEAD)"
    
    echo -e "${GREEN}✅ Netlify deploy complete${NC}"
fi

echo ""
echo -e "${BLUE}🎉 Deployment complete!${NC}"
echo -e "📱 PWA available at your configured domain"
echo -e "🔍 Run Lighthouse audit: npx lighthouse https://your-domain.com --view"