# ADR-017: Finnhub API with Yahoo Finance Fallback

**Status**: Accepted

**Date**: 2025-11-25

**Deciders**: Development Team

**Technical Story**: Reverse-engineered from the implemented external market-data retrieval flow

## Context

The application depends on external market data for two related but different needs:
- Current prices and company/profile lookups
- Historical data used to derive multi-year CAGR values

Finnhub is the primary market-data integration, but historical candle access can be limited or premium-gated depending on the endpoint and plan. The product still needs useful CAGR data for portfolio planning even when premium Finnhub historical access is unavailable. The architecture therefore needs a fallback that:
- Preserves Finnhub as the primary provider abstraction
- Avoids breaking calculation flows when one provider is limited
- Keeps external-service handling behind repository/service boundaries
- Caches successful results to reduce repeated outbound traffic

## Decision

Use **Finnhub as the primary market-data provider** while adding a **Yahoo Finance fallback for historical CAGR retrieval**.

### Provider strategy

1. **Current price and profile flows**
   - Continue using Finnhub as the main upstream provider
   - Preserve the `IAssetDataRepository` abstraction for testability

2. **Historical CAGR flows**
   - Attempt Yahoo Finance first for monthly historical price series
   - If Yahoo returns usable history, calculate CAGR values from that data and cache the result
   - If Yahoo fails or yields no usable values, fall back to Finnhub historical retrieval

3. **Caching and resilience**
   - Cache successful CAGR results to reduce repeated provider calls
   - Return partial/null CAGR entries safely when no provider has enough data

## Consequences

### Positive
- Reduces dependence on premium-only or less reliable single-provider historical access
- Improves calculation resilience for user portfolios that need historical growth estimates
- Keeps external data concerns behind existing repository and service abstractions
- Allows the application to use the best available source for each data shape instead of forcing one provider to do everything

### Negative
- Historical data behavior now depends on two upstream providers with different response formats and operational characteristics
- Debugging data discrepancies can require understanding both Yahoo and Finnhub behavior
- Tests and monitoring must account for fallback paths, not just the happy path

### Neutral
- The app remains Finnhub-centric overall, but accepts a mixed-provider strategy for specific historical use cases
- CAGR completeness can still vary by asset symbol and provider availability

## Alternatives Considered

### Alternative 1: Finnhub Only
**Description**: Use Finnhub for all current and historical market data without fallback.

**Pros**:
- Simpler provider model
- Single external integration to maintain

**Cons**:
- Historical data may be unavailable or degraded without premium access
- CAGR calculations become more fragile for users

**Why not chosen**: The application needs historical growth inputs even when Finnhub historical coverage is constrained.

### Alternative 2: Yahoo Finance as the Primary Provider
**Description**: Move all market data retrieval to Yahoo-backed flows.

**Pros**:
- Fewer split-provider decisions
- Good historical coverage for many symbols

**Cons**:
- Weaker alignment with the project’s existing Finnhub-first repository model
- Profile and price flows would need broader rework
- Unofficial access characteristics are less desirable as a universal primary provider

**Why not chosen**: The current architecture and configuration are already centered on Finnhub, and only historical CAGR retrieval needed additional resilience.

### Alternative 3: Store Historical Data Internally
**Description**: Build and maintain an internal historical price store.

**Pros**:
- Full control over historical queries
- Reduced runtime dependence on public APIs

**Cons**:
- Much higher storage, ingestion, and maintenance complexity
- Out of scope for the current planning application

**Why not chosen**: The project does not need its own market-data platform.

## Implementation Notes

- `FinnhubService` checks cache, then tries Yahoo history, then falls back to Finnhub
- `IAssetDataRepository` exposes `FetchYahooHistoricalDataAsync` so the fallback remains testable behind the repository abstraction
- Yahoo data is retrieved from the chart endpoint and converted into per-horizon CAGR values inside the service layer

## References

- `src/Services/FinnhubService.cs`
- `src/Repositories/IAssetDataRepository.cs`
- `src/Repositories/FinnhubAssetDataRepository.cs`
- `docs/architecture/SYSTEM_DESIGN_DOCUMENT.md`
