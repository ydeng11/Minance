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
