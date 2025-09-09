# BTC TypeScript Node.js Project

A modern TypeScript Node.js project for running functions, featuring a clean architecture and development tools.

## Features

- **TypeScript**: Full TypeScript support with strict configuration
- **Yarn**: Fast, reliable, and secure dependency management
- **ESLint**: Code linting and formatting
- **Jest**: Testing framework
- **ts-node**: Direct TypeScript execution for development
- **Structured logging**: Custom logger utility
- **Function-based**: Focus on running functions instead of servers
- **Type definitions**: Comprehensive TypeScript interfaces

## Project Structure

```
btc/
├── src/
│   ├── functions/
│   │   └── example.ts         # Example functions
│   ├── types/
│   │   └── index.ts           # TypeScript type definitions
│   ├── utils/
│   │   └── logger.ts          # Logging utility
│   └── index.ts               # Main execution entry point
├── dist/                      # Compiled JavaScript output
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── .eslintrc.json             # ESLint configuration
├── jest.config.js             # Jest testing configuration
├── yarn.lock                  # Yarn lockfile
├── .gitignore                 # Git ignore rules
└── README.md                  # This file
```

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- Yarn package manager

### Installation

1. Install dependencies:

```bash
yarn install
```

2. Run functions directly:

```bash
yarn dev
```

3. Or build and run in production mode:

```bash
yarn build
yarn start
```

## Available Scripts

- `yarn dev` - Run functions directly with ts-node
- `yarn run` - Alternative command to run functions
- `yarn build` - Compile TypeScript to JavaScript
- `yarn start` - Run the compiled application
- `yarn watch` - Watch mode for TypeScript compilation
- `yarn test` - Run tests with Jest
- `yarn lint` - Run ESLint
- `yarn lint:fix` - Fix ESLint issues automatically
- `yarn clean` - Remove dist directory

## Example Functions

The project includes several example functions in `src/functions/example.ts`:

- `exampleFunction()` - Simple string processing
- `calculateSum()` - Math operations
- `processData()` - Async data processing
- `divideNumbers()` - Error handling example
- `filterEvenNumbers()` - Array operations
- `formatCurrency()` - String formatting

## Running Functions

### Direct execution:

```bash
yarn dev
```

### Import and use in other files:

```typescript
import { calculateSum, processData } from "./functions/example";

const sum = calculateSum([1, 2, 3, 4, 5]);
const result = await processData({ name: "BTC", value: 100 });
```

## Development

The project uses TypeScript with strict mode enabled. Key features:

- **Strict Type Checking**: All TypeScript strict flags are enabled
- **Path Mapping**: Use `@/*` to reference src directory
- **Source Maps**: Generated for debugging
- **Declaration Files**: Type definitions are generated

## Testing

Tests are written using Jest and should be placed in the `src` directory with `.test.ts` or `.spec.ts` extensions.

```bash
yarn test
```

## Contributing

1. Follow the ESLint configuration
2. Write tests for new features
3. Use TypeScript strict mode
4. Follow the existing project structure

## License

MIT
