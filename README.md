# Minance

A personal expense analysis tool built with Quarkus and React.

![image](https://github.com/user-attachments/assets/77d75d24-90b5-4d6d-91f1-8e9546eae563)


## Features

- Clean and intuitive user interface
- CSV transaction import support
- Privacy-focused design
- Expense visualization and tracking
- Multi-bank account management

## Tech Stack

- Backend: Quarkus
- Frontend: React + TypeScript + Vite
- Database: PostgreSQL
- Build Tool: Maven

## Development

### Prerequisites

- Java 21+
- Node.js 18+
- Docker (optional)
- Maven

### Running Locally

1. Start the development server:

```bash
quarkus dev
```

2. The application will be available at:

- Backend API: http://localhost:8080
- Frontend: http://localhost:3000

### Building for Production

Create a production build:

```bash
quarkus build --no-tests
```

For native executable (requires GraalVM):

```bash
quarkus build --native --no-tests
```

### Docker Support

Build multi-platform Docker image:

```bash
docker build --platform linux/amd64,linux/arm64 -f src/main/docker/Dockerfile.jvm -t minance:latest .
```

## License

MIT License - See [LICENSE](LICENSE) for details

## Project Structure

```
minance/
├── src/
│   ├── main/
│   │   ├── java/          # Backend code
│   │   ├── resources/     # Configuration files
│   │   ├── webui/        # Frontend React application
│   │   └── docker/       # Docker configurations
│   └── test/             # Test files
```
