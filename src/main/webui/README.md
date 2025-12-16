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
- npm 10.x (important: npm version matters for lockfile consistency)

> **Note**: This project uses npm 10.x in CI. Using a different npm version locally (e.g., npm 11.x) can cause `package-lock.json` to resolve dependencies differently, leading to CI failures. If you're using Node.js 20, it comes with npm 10.x by default. To check your versions:
>
> ```bash
> node --version  # Should be v20.x
> npm --version   # Should be 10.x
> ```
>
> If you have npm 11 or higher, you can use `npx -y --package=npm@10 npm install` to ensure lockfile compatibility with CI.

### Getting Started

1. Install dependencies:

```bash
npm install
```

2. Start development server:

```bash
npm run dev
```

The development server will start at http://localhost:3000

### Building

Create production build:

```bash
npm run build
```

Build output will be in the `dist` directory.

### Testing

Run tests:

```bash
npm run test
```

For a tight TDD loop, keep Vitest in watch mode:

```bash
npm run test -- --watch
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
