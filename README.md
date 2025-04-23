# Minance

Modern personal finance analytics platform built with Quarkus and React.

![Application Screenshot](https://github.com/user-attachments/assets/77d75d24-90b5-4d6d-91f1-8e9546eae563)

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

### Running Locally

Backend development server:
```bash
quarkus dev
```

Access points:
- API: http://localhost:8080
- UI: http://localhost:3000

### Production Build

Standard build:
```bash
quarkus build --no-tests
```

Native executable (requires GraalVM):
```bash
quarkus build --native --no-tests
```

### Docker Deployment

Multi-platform image build:
```bash
docker build --platform linux/amd64,linux/arm64 -f src/main/docker/Dockerfile.jvm -t minance:latest .
```

### Docker Compose Example

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

Then you can access `Minance` as http://localhost:8080.

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
