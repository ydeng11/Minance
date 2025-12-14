#!/bin/bash

# Version Release Script
# This script automates the versioning workflow for releases

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

# Determine release version
if [ -n "$1" ]; then
    RELEASE_VERSION="$1"
else
    # Auto-determine from current version (remove -SNAPSHOT if present)
    RELEASE_VERSION=$(echo "$CURRENT_VERSION" | sed 's/-SNAPSHOT$//')
fi

print_info "Release version: $RELEASE_VERSION"

# Check if version already exists as a tag
if git rev-parse "v$RELEASE_VERSION" >/dev/null 2>&1; then
    print_error "Tag v$RELEASE_VERSION already exists"
    exit 1
fi

# Confirm before proceeding
read -p "Proceed with release version $RELEASE_VERSION? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warn "Release cancelled"
    exit 0
fi

# --- Release Phase ---
print_info "Setting release version..."

if [[ "$CURRENT_VERSION" == *"-SNAPSHOT"* ]]; then
    ./mvnw versions:set -DremoveSnapshot -DnewVersion="$RELEASE_VERSION"
else
    ./mvnw versions:set -DnewVersion="$RELEASE_VERSION"
fi

print_info "Building release artifact..."
./mvnw clean package -DskipTests

print_info "Committing release version..."
git add pom.xml
git commit -m "[RELEASE] $RELEASE_VERSION" || print_warn "No changes to commit"

print_info "Creating tag v$RELEASE_VERSION..."
git tag -a "v$RELEASE_VERSION" -m "Release version $RELEASE_VERSION"

print_info "Release version $RELEASE_VERSION is ready!"
print_warn "Don't forget to:"
echo "  1. git push origin main"
echo "  2. git push origin v$RELEASE_VERSION"
