# ADR-001: Layered Architecture with Service-Oriented Design

**Status**: Accepted

**Date**: 2024-11

**Deciders**: Architecture Team

**Technical Story**: System Design Document v3.0

## Context

The FIRE Planning Tool needed a clear architectural pattern that would:
- Support separation of concerns between UI, business logic, and data access
- Enable independent testing of components
- Allow the system to scale and evolve over time
- Provide clear boundaries between different responsibilities
- Support both backend API and frontend SPA development

The application handles complex financial calculations, real-time data integration, and user interface rendering, requiring a well-structured approach to manage complexity.

## Decision

Adopt a **Layered Architecture** pattern with service-oriented design principles, consisting of:

1. **Presentation Layer (Frontend)**
   - Single Page Application (SPA) using TypeScript/ES6 modules
   - Modular components for UI elements
   - State management for application data

2. **API Layer (Controllers)**
   - ASP.NET Core Web API controllers
   - Request/response handling
   - Input validation coordination
   - HTTP concerns (routing, status codes)

3. **Business Logic Layer (Services)**
   - Domain services for calculations (FireCalculator, PortfolioCalculator, etc.)
   - Business rule enforcement
   - Orchestration of complex operations
   - Pure business logic without infrastructure concerns

4. **Integration Layer**
   - External API integration (FinnhubService)
   - Repository pattern for data access abstraction
   - HTTP client management

5. **Domain Layer (Models)**
   - Data Transfer Objects (DTOs)
   - Domain entities
   - Value objects

## Consequences

### Positive
- **Clear Separation of Concerns**: Each layer has well-defined responsibilities
- **Testability**: Layers can be tested in isolation with mocked dependencies
- **Maintainability**: Changes in one layer rarely affect others
- **Scalability**: Can scale different layers independently if needed
- **Developer Onboarding**: Standard pattern that's well-understood
- **Flexibility**: Easy to swap implementations (e.g., change data providers)

### Negative
- **Additional Abstraction**: More files and interfaces to manage
- **Learning Curve**: Developers need to understand layer boundaries
- **Potential Over-Engineering**: Simple features might require touching multiple layers

### Neutral
- **Standard .NET Pattern**: Follows common ASP.NET Core application structure
- **Directory Organization**: Code organized by layer (Controllers/, Services/, Models/)

## Alternatives Considered

### Alternative 1: Monolithic Architecture
**Description**: Single layer with all concerns mixed

**Pros**:
- Simpler initial development
- Fewer files to manage
- Direct access between components

**Cons**:
- Poor separation of concerns
- Difficult to test
- Hard to maintain as application grows
- Business logic mixed with infrastructure code

**Why not chosen**: Doesn't scale well for complex financial calculations and would make testing difficult.

### Alternative 2: Microservices Architecture
**Description**: Split into multiple independent services

**Pros**:
- Maximum separation and independence
- Can scale services individually
- Technology diversity possible

**Cons**:
- Significant operational complexity
- Distributed system challenges
- Overkill for current application size
- Higher infrastructure costs

**Why not chosen**: Too complex for a single-user desktop/web application with no need for independent scaling of components.

### Alternative 3: Clean Architecture (Onion Architecture)
**Description**: Domain-centric with dependencies pointing inward

**Pros**:
- Maximum testability
- Domain logic completely isolated
- Very flexible

**Cons**:
- More abstractions and indirection
- Steeper learning curve
- More boilerplate code
- Potentially over-engineered for this application

**Why not chosen**: While excellent for large enterprise applications, the additional complexity wasn't justified for this project size.

## Implementation Notes

The layered architecture is implemented as follows:

```
fire/
├── Controllers/          # API Layer
│   ├── FirePlanController.cs
│   └── AssetPricesController.cs
├── Services/             # Business Logic Layer
│   ├── FireCalculator.cs
│   ├── PortfolioCalculator.cs
│   ├── CurrencyConverter.cs
│   └── ...
├── Repositories/         # Integration Layer
│   ├── IAssetDataRepository.cs
│   └── FinnhubAssetDataRepository.cs
├── Models/               # Domain Layer
│   ├── FirePlanModels.cs
│   └── AssetPriceModels.cs
└── wwwroot/              # Presentation Layer
    ├── index.html
    ├── ts/               # TypeScript source
    └── js/               # Compiled JavaScript
```

Dependency flow: Presentation → Controllers → Services → Repositories/Models

## References

- [System Design Document](../architecture/SYSTEM_DESIGN_DOCUMENT.md)
- [ASP.NET Core Architecture](https://docs.microsoft.com/en-us/dotnet/architecture/modern-web-apps-azure/)
- [Layered Architecture Pattern](https://www.oreilly.com/library/view/software-architecture-patterns/9781491971437/ch01.html)
