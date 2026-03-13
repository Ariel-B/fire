# ADR-005: Repository Pattern for External API Access

**Status**: Accepted

**Date**: 2025-12

**Deciders**: Development Team

## Context

The FinnhubService originally handled both HTTP communication and business logic:
- Direct HTTP calls to Finnhub and Yahoo Finance APIs
- Caching of stock prices and company profiles
- CAGR calculation logic
- Input validation and sanitization
- Fallback logic between providers

This tight coupling made testing difficult:
- Tests had to mock `HttpMessageHandler` (complex and brittle)
- Business logic couldn't be tested without HTTP concerns
- Changing data providers required modifying service code
- No clear separation between data access and business logic

## Decision

Implement the **Repository Pattern** to separate HTTP communication concerns from business logic by introducing an abstraction layer for stock data access.

### Architecture:

1. **IAssetDataRepository** (Interface)
   - Defines contract for asset data operations
   - Methods:
     - `FetchCurrentPriceAsync()` - Get current asset price
     - `FetchCompanyProfileAsync()` - Get asset information
     - `FetchCandleDataAsync()` - Get historical OHLCV data from Finnhub

2. **FinnhubAssetDataRepository** (Implementation)
   - Implements HTTP calls to external APIs
   - Handles request/response serialization
   - Returns raw data without caching or validation
   - Purely concerned with data access

3. **FinnhubService** (Business Logic)
   - Uses `IAssetDataRepository` for data access
   - Responsibilities:
     - Input validation (symbol format, sanitization)
     - Caching (prices, profiles, CAGR data)
     - Business logic (CAGR calculation, data aggregation)
     - Fallback logic (Yahoo → Finnhub)

## Consequences

### Positive
- **Improved Testability**: Can mock `IAssetDataRepository` instead of `HttpMessageHandler`
- **Separation of Concerns**: Data access separated from business logic
- **Easy Provider Swap**: Can add new providers by implementing interface
- **Simpler Tests**: Repository mocks are straightforward
- **Decorator Pattern Support**: Can add caching or logging at repository level
- **Clear Boundaries**: HTTP concerns isolated from business logic

### Negative
- **Additional Abstraction**: One more layer to navigate
- **More Files**: Separate interface and implementation files

### Neutral
- **Standard Pattern**: Well-known pattern in enterprise applications

## Alternatives Considered

### Alternative 1: Keep Direct HTTP in Service
**Description**: Original approach with HttpClient in FinnhubService

**Pros**:
- Fewer files
- More direct
- No abstraction layer

**Cons**:
- Hard to test (mock HttpMessageHandler)
- Business logic coupled to HTTP
- Can't easily swap providers
- Mixed responsibilities

**Why not chosen**: Testing complexity and tight coupling made maintenance difficult.

### Alternative 2: Generic Repository Pattern
**Description**: Generic `IRepository<T>` with CRUD operations

**Pros**:
- Reusable across entities
- Less code duplication

**Cons**:
- Too abstract for external APIs
- Doesn't fit HTTP API semantics
- Forces all operations into CRUD model
- Leaky abstraction

**Why not chosen**: External APIs don't fit CRUD model. Need domain-specific operations.

### Alternative 3: Gateway Pattern
**Description**: More complex pattern with request/response objects

**Pros**:
- Very flexible
- Can handle complex scenarios
- Clear request/response types

**Cons**:
- Over-engineered for this use case
- More boilerplate
- Additional complexity

**Why not chosen**: Repository pattern provides needed abstraction without excess complexity.

### Alternative 4: Direct HttpClient Injection
**Description**: Inject HttpClient directly into FinnhubService

**Pros**:
- Simple
- Built-in to .NET
- No custom abstractions

**Cons**:
- Still hard to test
- HTTP concerns in service
- Can't swap providers easily

**Why not chosen**: Doesn't solve testing or provider swap problems.

## Implementation Notes

Dependency injection registration:

```csharp
// In src/Program.cs
builder.Services.AddHttpClient<IAssetDataRepository, FinnhubAssetDataRepository>();
builder.Services.AddScoped<IFinnhubService, FinnhubService>();
```

Interface definition:

```csharp
public interface IAssetDataRepository
{
    Task<decimal?> FetchCurrentPriceAsync(string symbol);
    Task<CompanyProfile?> FetchCompanyProfileAsync(string symbol);
    Task<CandleData?> FetchCandleDataAsync(string symbol, long from, long to);
    Task<List<HistoricalDataPoint>> FetchYahooHistoricalDataAsync(string symbol, long from, long to);
}
```

Service usage:

```csharp
public class FinnhubService : IFinnhubService
{
    private readonly IAssetDataRepository _repository;
    private readonly IMemoryCache _cache;

    public async Task<decimal?> GetAssetPriceAsync(string symbol)
    {
        // Check cache first
        if (_cache.TryGetValue($"price_{symbol}", out decimal cachedPrice))
            return cachedPrice;

        // Validate input
        if (!IsValidSymbol(symbol))
            return null;

        // Fetch from repository
        var price = await _repository.FetchCurrentPriceAsync(symbol);

        // Cache result
        if (price.HasValue)
            _cache.Set($"price_{symbol}", price.Value, TimeSpan.FromMinutes(5));

        return price;
    }
}
```

Testing example:

```csharp
// Simple repository mock
var repositoryMock = new Mock<IAssetDataRepository>();
repositoryMock
    .Setup(r => r.FetchCurrentPriceAsync("AAPL"))
    .ReturnsAsync(150.0m);

var service = new FinnhubService(repositoryMock.Object, cache);
var price = await service.GetAssetPriceAsync("AAPL");

Assert.Equal(150.0m, price);
```

## References

- [Martin Fowler - Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html)
- [IAssetDataRepository.cs](../../src/Repositories/IAssetDataRepository.cs)
- [FinnhubAssetDataRepository.cs](../../src/Repositories/FinnhubAssetDataRepository.cs)
- [FinnhubService.cs](../../src/Services/FinnhubService.cs)
