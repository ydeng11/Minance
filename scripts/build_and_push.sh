#!/bin/bash

# Exit on error
set -e

# Build the application
echo "Building application..."
./mvnw package -DskipTests

# Build Docker image
echo "Building Docker image..."
docker build -f src/main/docker/Dockerfile.jvm -t minance:latest .

# Tag with version from pom.xml
docker tag minance:latest ydeng11/minance:latest

# Push to registry
echo "Pushing to registry..."
docker push ydeng11/minance:latest
echo "Successfully pushed to registry"

echo "Build complete!"
