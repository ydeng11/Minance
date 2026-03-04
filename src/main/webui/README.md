# Minance Frontend

The frontend application for Minance, built with React, TypeScript, and Vite.

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Tremor (for charts)

## Development

### Prerequisites

- Node.js 20+ (match the CI environment)
- pnpm 10.x

> **Note**: This project uses pnpm in CI. Use the same major pnpm version locally for consistent installs.
>
> ```bash
> node --version  # Should be v20.x
> pnpm --version  # Should be 10.x
> ```

### Getting Started

1. Install dependencies:

```bash
pnpm install
```

2. Start development server:

```bash
pnpm dev
```

The development server will start at http://localhost:3000

### Building

Create production build:

```bash
pnpm build
```

Build output will be in the `dist` directory.

### Testing

Run tests:

```bash
pnpm test
```

For a tight TDD loop, keep Vitest in watch mode:

```bash
pnpm test -- --watch
```

## Project Structure

```
webui/
├── src/
│   ├── components/     # React components
│   ├── services/      # API services
│   ├── store/         # State management
│   ├── types/         # TypeScript types
│   └── utils/         # Utility functions
├── public/            # Static assets
└── dist/             # Build output
```

## License

MIT License - See [LICENSE](LICENSE) for details
