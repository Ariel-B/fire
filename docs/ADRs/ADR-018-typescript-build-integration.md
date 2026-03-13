# ADR-018: Multi-Stage Build TypeScript Compilation

**Status**: Accepted

**Date**: 2025-12-12

**Deciders**: Development Team

**Technical Story**: Reverse-engineered from MSBuild and publish integration for the frontend asset pipeline

## Context

The application uses TypeScript source files under `wwwroot/ts` and serves compiled browser assets from `wwwroot/js`. Because this is an ASP.NET Core application with static frontend assets embedded in the same repository, the build process must ensure that:
- Frontend TypeScript is compiled before running or publishing the app
- Generated JavaScript, source maps, and declaration files are available in output and publish artifacts
- Incremental builds remain fast enough for local development
- Developers can opt out in exceptional cases without changing the default pipeline

Relying on developers to run `tsc` manually would create frequent drift between source and served assets.

## Decision

Integrate **TypeScript compilation directly into MSBuild** so frontend assets are compiled automatically before `Build` and `Publish`.

### Build contract

1. **Source and output locations**
   - TypeScript source lives in `wwwroot/ts`
   - Compiled output lives in `wwwroot/js`

2. **MSBuild target**
   - A dedicated `CompileFrontendTypeScript` target runs before `Build` and `Publish`
   - Compilation uses `npx tsc -p tsconfig.json --incremental`
   - A `.tsbuildinfo` file in `wwwroot/js` enables incremental recompilation

3. **Output propagation**
   - Generated JavaScript, CSS, source maps, and declaration files are explicitly included in output and publish artifacts

4. **Escape hatch**
   - `SkipFrontendBuild=true` can bypass the step when needed

## Consequences

### Positive
- Keeps served frontend assets aligned with the checked-in TypeScript source during normal build and publish flows
- Reduces human error from forgotten manual compilation steps
- Makes `dotnet build` and `dotnet publish` closer to the true application build contract
- Preserves fast local iteration through incremental TypeScript compilation

### Negative
- The .NET build now depends on Node/npm tooling being available when frontend compilation is enabled
- Build failures can originate from frontend issues even when developers are working primarily in backend code
- Build logic is slightly more complex than a pure backend project

### Neutral
- The repository remains a single-project full-stack application rather than splitting frontend and backend into separate build pipelines
- Output inclusion is explicit in the project file rather than inferred solely from static-file conventions

## Alternatives Considered

### Alternative 1: Manual Frontend Compilation
**Description**: Require developers and CI to run `tsc` separately.

**Pros**:
- Simpler `.csproj`
- Clear separation between backend and frontend toolchains

**Cons**:
- Easy to forget locally
- Higher chance of stale `wwwroot/js` output
- More room for CI/build drift

**Why not chosen**: The project benefits from treating frontend compilation as part of the application build, not an optional extra step.

### Alternative 2: Separate Bundler-Only Pipeline
**Description**: Move to a distinct frontend bundler workflow and publish artifacts into the web root.

**Pros**:
- More advanced asset-pipeline features
- Stronger separation of concerns

**Cons**:
- More tooling and configuration complexity
- Unnecessary overhead for the current native-module frontend approach

**Why not chosen**: The existing TypeScript-to-native-module model does not need bundler-first complexity.

### Alternative 3: Runtime Compilation or On-Demand Dev Serving
**Description**: Compile TypeScript outside the MSBuild pipeline during development only.

**Pros**:
- Potentially faster backend-only builds in some cases

**Cons**:
- Publish-time guarantees become weaker
- Local and CI behavior can diverge

**Why not chosen**: The project values consistent build behavior between development and publish workflows.

## Implementation Notes

- The MSBuild target is defined in `FirePlanningTool.csproj`
- The target declares TypeScript source files as inputs and `.tsbuildinfo` as output for incremental behavior
- Generated assets are explicitly marked with `CopyToOutputDirectory` and `CopyToPublishDirectory`

## References

- `FirePlanningTool.csproj`
- `tsconfig.json`
- `README.md`
- `docs/TESTING.md`
