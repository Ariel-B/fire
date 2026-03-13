# ADR-003: TypeScript/ES6 Modules for Frontend

**Status**: Accepted

**Date**: 2024-11

**Deciders**: Development Team

**Technical Story**: Frontend technology stack selection

## Context

The FIRE Planning Tool frontend needed a technology solution for:
- Complex client-side state management
- Real-time calculations and chart updates
- Modular, maintainable code organization
- Type safety to prevent runtime errors
- Modern JavaScript features without heavy frameworks
- Integration with Chart.js for visualizations
- Support for Hebrew RTL layout

The frontend handles portfolio management, expense tracking, real-time stock price updates, and interactive charts, requiring a structured approach without the overhead of large frameworks like React or Angular.

## Decision

Adopt **TypeScript 5.x** compiled to **ES2022** JavaScript with **native ES6 modules**, organized in a modular architecture without using a frontend framework.

### Key Components:
- **Language**: TypeScript 5.x
- **Target**: ES2022 (modern JavaScript)
- **Module System**: ES6 modules (native browser support)
- **Build Tool**: TypeScript compiler (tsc)
- **No Framework**: Pure TypeScript/JavaScript with DOM manipulation
- **Module Organization**:
  - `api/` - API client modules
  - `components/` - UI component modules  
  - `services/` - Business logic services
  - `utils/` - Utility functions
  - `config/` - Configuration modules
  - `types/` - TypeScript type definitions

## Consequences

### Positive
- **Type Safety**: Compile-time type checking prevents many runtime errors
- **Modern Features**: Can use latest JavaScript features (async/await, destructuring, optional chaining)
- **No Framework Overhead**: Smaller bundle size, faster load times
- **Direct DOM Control**: Full control over rendering and updates
- **Easy Debugging**: Source maps for debugging TypeScript in browser
- **Incremental Compilation**: Fast rebuilds during development
- **Native Modules**: No bundler required, browser-native module loading
- **Clear Structure**: Modular organization matches backend service layers

### Negative
- **No Virtual DOM**: Manual DOM manipulation can be error-prone
- **Build Step Required**: TypeScript must be compiled to JavaScript
- **Less Abstraction**: More boilerplate for UI components
- **Manual State Management**: No framework-provided state management

### Neutral
- **Vanilla Approach**: Closer to web standards, easier to understand
- **Learning Curve**: Requires TypeScript knowledge but no framework concepts

## Alternatives Considered

### Alternative 1: React with TypeScript
**Description**: Popular UI library with component model

**Pros**:
- Virtual DOM for efficient updates
- Large ecosystem of components
- Well-documented patterns
- Strong community support
- Built-in state management options

**Cons**:
- Larger bundle size (React + ReactDOM ~140KB minified)
- Framework lock-in
- More complex build setup
- Overkill for relatively simple UI
- Additional concepts to learn (hooks, JSX, component lifecycle)

**Why not chosen**: Too heavyweight for this application. The UI complexity doesn't justify the framework overhead.

### Alternative 2: Vue.js
**Description**: Progressive framework for building UIs

**Pros**:
- Simpler than React
- Good documentation
- Smaller size than React
- Reactive data binding
- Can be used incrementally

**Cons**:
- Still adds framework overhead (~35KB minified)
- Single File Components require build setup
- Framework-specific patterns
- Less type safety than pure TypeScript

**Why not chosen**: While lighter than React, still adds unnecessary complexity for the application needs.

### Alternative 3: Vanilla JavaScript (no TypeScript)
**Description**: Pure ES6+ JavaScript without TypeScript

**Pros**:
- No compilation step
- Simpler tooling
- Direct browser execution
- Fast development iteration

**Cons**:
- No type safety
- Runtime errors from typos
- Harder to refactor
- Poor IDE autocomplete
- More bugs in complex state management

**Why not chosen**: Type safety is crucial for financial calculations and complex state. TypeScript prevents many categories of bugs at compile time.

### Alternative 4: Svelte
**Description**: Compiler-based framework

**Pros**:
- Compiles to vanilla JS
- No virtual DOM overhead
- Reactive by default
- Small bundle size

**Cons**:
- Less mature ecosystem
- Framework-specific syntax
- Build complexity
- Smaller community

**Why not chosen**: While interesting, adds framework lock-in without significant benefit for this project size.

## Implementation Notes

TypeScript configuration in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "node",
    "outDir": "./wwwroot/js",
    "rootDir": "./wwwroot/ts",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

Build integration in `.csproj`:
```xml
<Target Name="CompileFrontendTypeScript" BeforeTargets="Build;Publish">
  <Exec Command="npx tsc -p tsconfig.json" />
</Target>
```

Module structure:
```
wwwroot/
├── ts/                    # TypeScript source
│   ├── app.ts            # Main entry point
│   ├── api/
│   │   ├── assets-api.ts
│   │   └── fire-plan-api.ts
│   ├── components/
│   │   ├── portfolio-table.ts
│   │   ├── expense-table.ts
│   │   └── chart-manager.ts
│   ├── services/
│   │   ├── calculator.ts
│   │   └── state.ts
│   ├── utils/
│   │   ├── currency.ts
│   │   ├── formatter.ts
│   │   └── dom.ts
│   └── types/
│       └── index.ts
└── js/                    # Compiled JavaScript
```

## References

- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [ES2022 Features](https://exploringjs.com/impatient-js/ch_new-javascript-features.html)
- [tsconfig.json](../../tsconfig.json)
- [TypeScript Instructions](.github/instructions/typescript-5-es2022.instructions.md)
