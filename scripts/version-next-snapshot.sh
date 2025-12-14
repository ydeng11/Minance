#!/bin/bash

# Next Snapshot Version Script
# This script sets the next snapshot version after a release

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    print_error "Not in a git repository"
    exit 1
fi

# Get current version
CURRENT_VERSION=$(./mvnw help:evaluate -Dexpression=project.version -q -DforceStdout)
print_info "Current version: $CURRENT_VERSION"

# Determine next snapshot version
if [ -n "$1" ]; then
    NEXT_VERSION="$1"
    # Ensure it ends with -SNAPSHOT
    if [[ ! "$NEXT_VERSION" == *"-SNAPSHOT"* ]]; then
        NEXT_VERSION="${NEXT_VERSION}-SNAPSHOT"
    fi
else
    # Auto-increment patch version
    BASE_VERSION=$(echo "$CURRENT_VERSION" | sed 's/-SNAPSHOT$//')
    IFS='.' read -ra VERSION_PARTS <<< "$BASE_VERSION"
    MAJOR="${VERSION_PARTS[0]}"
    MINOR="${VERSION_PARTS[1]}"
    PATCH="${VERSION_PARTS[2]}"
    PATCH=$((PATCH + 1))
    NEXT_VERSION="${MAJOR}.${MINOR}.${PATCH}-SNAPSHOT"
fi

print_info "Next snapshot version: $NEXT_VERSION"

# Confirm before proceeding
read -p "Proceed with next snapshot version $NEXT_VERSION? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warn "Operation cancelled"
    exit 0
fi

# Set next snapshot version
print_info "Setting next snapshot version..."
./mvnw versions:set -DnewVersion="$NEXT_VERSION"

print_info "Committing next snapshot version..."
git add pom.xml
git commit -m "[CI] Set next snapshot version $NEXT_VERSION" || print_warn "No changes to commit"

print_info "Next snapshot version $NEXT_VERSION is set!"
print_warn "Don't forget to: git push origin main"
