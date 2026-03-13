# ADR-002: .NET 9.0 and ASP.NET Core Web API

**Status**: Accepted

**Date**: 2024-11

**Deciders**: Development Team

**Technical Story**: Technology stack selection for backend implementation

## Context

The FIRE Planning Tool required a backend technology stack for:
- Building RESTful APIs for frontend consumption
- Complex financial calculations requiring high precision
- Real-time data integration with external APIs
- Cross-platform deployment (Windows, Linux, macOS)
- Strong typing and compile-time safety
- Excellent tooling and IDE support

The backend needed to handle portfolio simulations, tax calculations, and integration with stock market data providers while maintaining high performance and reliability.

## Decision

Adopt **.NET 9.0** with **ASP.NET Core Web API** as the backend technology stack, using **C# 13** as the programming language.

### Key Components:
- **Runtime**: .NET 9.0
- **Framework**: ASP.NET Core 9.0
- **Language**: C# 13
- **Web Server**: Kestrel (built-in)
- **Dependency Injection**: Microsoft.Extensions.DependencyInjection (built-in)
- **HTTP Client**: HttpClient with IHttpClientFactory
- **JSON Serialization**: System.Text.Json

## Consequences

### Positive
- **Modern Features**: Latest C# 13 features (records, pattern matching, required members)
- **Performance**: Excellent performance with minimal memory footprint
- **Cross-Platform**: Runs on Windows, Linux, macOS, and containers
- **Decimal Precision**: Native `decimal` type perfect for financial calculations
- **Strong Typing**: Compile-time type safety prevents many runtime errors
- **Async/Await**: First-class support for asynchronous programming
- **Built-in DI**: Native dependency injection without third-party libraries
- **Tooling**: Excellent IDE support (Visual Studio, VS Code, Rider)
- **Testing**: Comprehensive testing frameworks (xUnit, NUnit, MSTest)
- **Long-Term Support**: .NET 9.0 has LTS support with regular security updates
- **Ecosystem**: Rich ecosystem of libraries and packages via NuGet

### Negative
- **Learning Curve**: Developers need C# and .NET knowledge
- **Memory Usage**: Higher than some lightweight alternatives (Node.js, Go)
- **Platform Lock-in**: While cross-platform, optimized for Microsoft ecosystem
- **Compilation Required**: Not a scripting language; requires build step

### Neutral
- **Mature Technology**: Well-established with extensive documentation
- **Community**: Large, active community and Microsoft backing

## Alternatives Considered

### Alternative 1: Node.js with Express
**Description**: JavaScript/TypeScript backend using Node.js runtime

**Pros**:
- Same language as frontend (JavaScript/TypeScript)
- Fast development with npm ecosystem
- Good for I/O-bound operations
- Large community and package ecosystem

**Cons**:
- Floating-point precision issues for financial calculations
- Weaker typing even with TypeScript
- Callback/promise complexity
- Less suitable for CPU-intensive calculations
- No native decimal type

**Why not chosen**: Financial calculations require decimal precision that JavaScript's number type cannot provide reliably. The weak typing would increase bugs in complex financial logic.

### Alternative 2: Python with FastAPI
**Description**: Python-based REST API framework

**Pros**:
- Simple syntax and fast development
- Excellent for data science and calculations
- Rich ecosystem of financial libraries
- Good async support

**Cons**:
- Slower performance than compiled languages
- Dynamic typing can lead to runtime errors
- GIL limitations for true parallelism
- Less suitable for production high-performance APIs
- Deployment complexity

**Why not chosen**: Performance concerns and dynamic typing. While great for prototyping, .NET provides better production reliability and performance.

### Alternative 3: Java with Spring Boot
**Description**: Java-based enterprise framework

**Pros**:
- Mature enterprise framework
- Excellent performance
- Strong typing and compile-time safety
- Big Decimal for financial calculations
- Large ecosystem

**Cons**:
- More verbose than C#
- Slower development compared to modern languages
- Heavier runtime
- More boilerplate code
- Configuration complexity

**Why not chosen**: C# offers similar benefits with less verbosity, better modern language features, and simpler configuration.

### Alternative 4: Go
**Description**: Compiled language by Google

**Pros**:
- Excellent performance
- Simple deployment (single binary)
- Great for concurrent operations
- Low memory footprint

**Cons**:
- No native decimal type (requires third-party library)
- Limited generics support
- Simpler language with fewer features
- Smaller ecosystem for financial applications
- More manual error handling

**Why not chosen**: Lack of native decimal type and fewer language features. Better suited for infrastructure tools than financial applications.

## Implementation Notes

Configuration in `FirePlanningTool.csproj`:

```xml
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net9.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>
</Project>
```

Key features utilized:
- **Nullable Reference Types**: Enabled for null safety
- **Implicit Usings**: Reduces boilerplate code
- **Minimal APIs**: Available but controllers chosen for structure
- **Async/Await**: Used throughout for I/O operations
- **Dependency Injection**: Configured in src/Program.cs
- **FluentValidation**: Integrated with ASP.NET Core

The application uses Kestrel as the web server, running on port 5162 by default.

## References

- [ASP.NET Core Documentation](https://docs.microsoft.com/en-us/aspnet/core/)
- [.NET 9.0 What's New](https://docs.microsoft.com/en-us/dotnet/core/whats-new/dotnet-9)
- [C# 13 Features](https://docs.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-13)
- [FirePlanningTool.csproj](../../FirePlanningTool.csproj)
- [Program.cs](../../src/Program.cs)
