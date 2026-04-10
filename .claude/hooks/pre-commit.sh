#!/bin/bash
# Pre-commit hook to ensure code quality before AI actions

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo "Running Pre-flight checks..."

# Check Prisma format
if command -v prisma &> /dev/null; then
    echo "Formatting Prisma schema..."
    prisma format
    if [ $? -ne 0 ]; then
        echo -e "${RED}Prisma formatting failed!${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}All local checks passed!${NC}"
exit 0