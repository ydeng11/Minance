# Minance

Modern personal finance analytics platform built with Quarkus and React.

![Demo](https://github.com/user-attachments/assets/bfd0d669-e2b8-484e-a9c7-5f1301d9481b)

## Features

- Privacy-focused personal finance management
- Multi-account transaction tracking
- Native support for major bank CSV formats (Chase, Discover, Bank of America, Citi, Amex)
- Extensible import framework for additional financial institutions
- Custom category creation to standardize transactions across different banks
- Advanced expense visualization and analytics
- Merchant spending pattern analysis
- Optimized for credit card and tap pay transaction analysis
- Clean, responsive user interface

## Download your transactions

### Bank of America
You should download the transactions from `My Financial Pictire` which contains more information than the data downloaded from account activities.
![image](https://github.com/user-attachments/assets/ffdc3ab3-f994-4a92-bcc8-56ef088556e2)

### Citi & Amex
Citi and Amex don't provide a category for the transactions data, so you will need to preprocess the data which should have headers - `Post Date, Transaction Date, Category, Description, Type, Amount, Memo` where `Type` indicates if it is an expense or balance payment.

### Others
The csv format of transactions can be downloaded directly from activity page and be imported into Minance without any preprocessing.

## Technology Stack

| Component | Technologies |
|-----------|-------------|
| Backend   | Quarkus, Java 21+ |
| Frontend  | React, TypeScript, Vite |
| Database  | PostgreSQL |
| Build     | Maven |
| Deployment| Docker-ready |

## Development Setup

### Prerequisites

- Java 21+
- Node.js 18+
- Maven
- PostgreSQL
- Docker (optional)

### Development

Backend development server:
```bash
quarkus dev
```

Access points:
- API: http://localhost:8080
- UI: http://localhost:3000

### Build

Standard build:
```bash
quarkus build --no-tests
```

Native executable (requires GraalVM):
```bash
quarkus build --native --no-tests
```

Multi-platform docker image build:
```bash
docker build --platform linux/amd64,linux/arm64 -f src/main/docker/Dockerfile.jvm -t minance:latest .
```

### Deployment

#### Java
```bash
java -jar ./target/minance-1.0.0.jar
```

#### Docker Run Example
```bash
docker run -d --name minance -p 8080:8080 -v /path/to/your/data:/deployments/data:rw ydeng11/minance:latest
```

#### Docker Compose Example

For a persistent deployment with PostgreSQL, create a `docker-compose.yml` file:

```yaml
version: "3.8"

services:
  minance:
    image: ydeng11/minance:latest
    container_name: minance
    ports:
      - "8080:8080"
    volumes:
      - /your/path/to/minance/data:/deployments/data:rw
```

Start the application stack:

```bash
docker-compose up -d
```

Then you can access `Minance` at http://localhost:8080.

## Releases

### Release Lifecycle

The project uses automated versioning and release workflows. The version follows Maven conventions with `-SNAPSHOT` for development versions.

#### Version Management

- **Development versions**: `X.Y.Z-SNAPSHOT` (e.g., `1.0.0-SNAPSHOT`)
- **Release versions**: `X.Y.Z` (e.g., `1.0.0`)

#### Creating a Release

1. **Ensure you're on a SNAPSHOT version** (e.g., `1.0.0-SNAPSHOT`)
2. **Go to GitHub Actions** → `Version Management` → `Run workflow`
3. **Select "release" action** and optionally specify the release version
4. **The workflow will**:
   - Remove `-SNAPSHOT` from the version
   - Build the release artifact
   - Build and push Docker images with tags: `latest` and version number
   - Create a git tag (e.g., `v1.0.0`)
   - Create a GitHub release
   - Commit and push the version change

#### Setting Next Development Version

After a release, set the next development version:

1. **Go to GitHub Actions** → `Version Management` → `Run workflow`
2. **Select "next-snapshot" action** and optionally specify the next version
3. **The workflow will**:
   - Auto-increment the patch version (e.g., `1.0.0` → `1.0.1-SNAPSHOT`)
   - Update `pom.xml` with the new snapshot version
   - Commit and push the change

#### Using Scripts Locally

Alternatively, you can use the provided scripts:

```bash
# Create a release
./scripts/version-release.sh [version]  # e.g., ./scripts/version-release.sh 1.0.0

# Set next snapshot version
./scripts/version-next-snapshot.sh [version]  # e.g., ./scripts/version-next-snapshot.sh 1.0.1-SNAPSHOT
```

### Docker Images

Docker images are automatically built and pushed to Docker Hub:

- **On every push to `main`**:
  - Tagged as `ydeng11/minance:edge` (latest development)
  - Tagged with version number (e.g., `ydeng11/minance:1.0.0-SNAPSHOT`)
  - Tagged with commit SHA (e.g., `ydeng11/minance:a1b2c3d`)

- **On formal releases**:
  - Tagged as `ydeng11/minance:latest` (latest stable release)
  - Tagged with version number (e.g., `ydeng11/minance:1.0.0`)

### Docker Hub Configuration

The workflows require Docker Hub credentials to be configured as GitHub secrets:

- `DOCKER_USERNAME`: Your Docker Hub username
- `DOCKER_PASSWORD`: Your Docker Hub password or personal access token

**Important:** If using a personal access token for Docker Hub authentication, note that tokens expire after 90 days. You'll need to update the `DOCKER_PASSWORD` secret in your repository settings before the token expires to ensure continuous releases.

To update the token:
1. Generate a new personal access token in Docker Hub
2. Go to your repository > Settings > Secrets and variables > Actions
3. Update the `DOCKER_PASSWORD` secret with the new token

## Project Structure

```
minance/
├── src/
│   ├── main/
│   │   ├── java/        # Backend services and API
│   │   ├── resources/   # Configuration files
│   │   ├── webui/       # React frontend application
│   │   └── docker/      # Container configurations
│   └── test/            # Test suite
```

## License

MIT License - See [LICENSE](LICENSE) for details
