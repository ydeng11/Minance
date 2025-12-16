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
    # Auto-determine from current version and latest git tag
    CURRENT_RELEASE=$(echo "$CURRENT_VERSION" | sed 's/-SNAPSHOT$//')

    # Get latest release tag (format: v1.0.0)
    LATEST_TAG=$(git tag -l "v*" | sort -V | tail -1 || echo "")

    if [ -z "$LATEST_TAG" ]; then
        # No tags exist, use current version without SNAPSHOT
        RELEASE_VERSION="$CURRENT_RELEASE"
        print_info "No existing tags found, using current version: $RELEASE_VERSION"
    else
        # Extract version from tag (remove 'v' prefix)
        LATEST_VERSION=$(echo "$LATEST_TAG" | sed 's/^v//')

        # Compare versions and use the higher one, or increment patch if equal
        IFS='.' read -ra CURRENT_PARTS <<< "$CURRENT_RELEASE"
        IFS='.' read -ra LATEST_PARTS <<< "$LATEST_VERSION"

        CURRENT_MAJOR="${CURRENT_PARTS[0]}"
        CURRENT_MINOR="${CURRENT_PARTS[1]}"
        CURRENT_PATCH="${CURRENT_PARTS[2]}"

        LATEST_MAJOR="${LATEST_PARTS[0]}"
        LATEST_MINOR="${LATEST_PARTS[1]}"
        LATEST_PATCH="${LATEST_PARTS[2]}"

        # If current version is higher or equal to latest, use it
        # Otherwise increment patch from latest
        if [ "$CURRENT_MAJOR" -gt "$LATEST_MAJOR" ] || \
           ([ "$CURRENT_MAJOR" -eq "$LATEST_MAJOR" ] && [ "$CURRENT_MINOR" -gt "$LATEST_MINOR" ]) || \
           ([ "$CURRENT_MAJOR" -eq "$LATEST_MAJOR" ] && [ "$CURRENT_MINOR" -eq "$LATEST_MINOR" ] && [ "$CURRENT_PATCH" -ge "$LATEST_PATCH" ]); then
            RELEASE_VERSION="$CURRENT_RELEASE"
            print_info "Current version ($CURRENT_RELEASE) is >= latest tag ($LATEST_VERSION), using current"
        else
            # Increment patch version from latest tag
            LATEST_PATCH=$((LATEST_PATCH + 1))
            RELEASE_VERSION="${LATEST_MAJOR}.${LATEST_MINOR}.${LATEST_PATCH}"
            print_info "Auto-incrementing from latest tag ($LATEST_VERSION) to: $RELEASE_VERSION"
        fi
    fi
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
echo "  1. git checkout -b release/$RELEASE_VERSION"
echo "  2. git push origin release/$RELEASE_VERSION"
echo "  3. git push origin v$RELEASE_VERSION"
echo "  4. Open a pull request from release/$RELEASE_VERSION to main"
