# ADR-010: Rate Limiting for API Protection

**Status**: Accepted

**Date**: 2024-11

**Deciders**: Development Team, Security Team

**Technical Story**: API protection and resource management

## Context

The FIRE Planning Tool's REST API needed protection against:
- Accidental or malicious abuse
- Resource exhaustion attacks
- Denial of Service (DoS) attempts
- Runaway client loops
- Fair resource distribution among users

Without rate limiting:
- Single client could overwhelm server
- External API quotas (Finnhub) could be exhausted
- Poor user experience for all during attacks
- Potential service outages

## Decision

Implement **Fixed Window Rate Limiting** using ASP.NET Core's built-in rate limiter middleware.

### Configuration:

```csharp
// Default limits (configurable in appsettings.json)
var permitLimit = 100;        // Requests per window
var windowSeconds = 60;       // Window size
var queueLimit = 0;           // No queuing

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
    {
        var ipAddress = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        
        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: ipAddress,
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = permitLimit,
                Window = TimeSpan.FromSeconds(windowSeconds),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = queueLimit
            });
    });
});
```

### Limits:
- **100 requests per minute per IP address**
- **429 Too Many Requests** response when exceeded
- **Configurable** via appsettings.json

## Consequences

### Positive
- **DoS Protection**: Prevents single client from overwhelming server
- **Fair Access**: Ensures all users get reasonable service
- **Resource Protection**: Protects external API quotas
- **Operational Stability**: Prevents accidental runaway processes
- **Cost Control**: Limits cloud infrastructure costs
- **Built-in Monitoring**: Logs rate limit violations

### Negative
- **Legitimate High Usage**: Power users may hit limits
- **Shared IPs**: Multiple users behind NAT may share limits

### Neutral
- **Client Responsibility**: Clients must implement retry logic

## Alternatives Considered

### Alternative 1: No Rate Limiting
**Description**: Leave API unprotected

**Pros**:
- Simple
- No configuration needed
- No false positives

**Cons**:
- Vulnerable to abuse
- No protection from accidents
- Resource exhaustion risk
- Poor operational stability

**Why not chosen**: Unacceptable risk for production API.

### Alternative 2: Sliding Window Rate Limiting
**Description**: More sophisticated window algorithm

**Pros**:
- Smoother rate limiting
- Better burst handling
- More accurate

**Cons**:
- More complex
- Higher memory usage
- Overkill for this application

**Why not chosen**: Fixed window is simpler and sufficient.

### Alternative 3: Token Bucket Algorithm
**Description**: Flexible token-based limiting

**Pros**:
- Allows controlled bursts
- Very flexible

**Cons**:
- More complex to configure
- Harder to reason about
- Not needed for this use case

**Why not chosen**: Fixed window provides adequate protection with simpler configuration.

### Alternative 4: External Rate Limiting (CloudFlare, etc.)
**Description**: Use external service for rate limiting

**Pros**:
- Offload processing
- DDoS protection
- Advanced features

**Cons**:
- Additional cost
- External dependency
- Configuration outside codebase
- Overkill for current scale

**Why not chosen**: Built-in rate limiting sufficient. Can add later if needed.

## Implementation Notes

Configuration in appsettings.json:

```json
{
  "RateLimiting": {
    "PermitLimit": 100,
    "WindowSeconds": 60,
    "QueueLimit": 0
  }
}
```

Enable middleware:

```csharp
app.UseRateLimiter();
```

Client-side handling:

```typescript
async function callApi(url: string): Promise<Response> {
    const response = await fetch(url);
    
    if (response.status === 429) {
        // Rate limited - wait and retry
        const retryAfter = response.headers.get('Retry-After') || '60';
        await delay(parseInt(retryAfter) * 1000);
        return callApi(url);
    }
    
    return response;
}
```

Monitoring:

```csharp
// Log rate limit violations
app.Use(async (context, next) =>
{
    await next();
    
    if (context.Response.StatusCode == 429)
    {
        var ip = context.Connection.RemoteIpAddress;
        _logger.LogWarning("Rate limit exceeded for IP: {IP}", ip);
    }
});
```

## References

- [Program.cs](../../src/Program.cs)
- [ASP.NET Core Rate Limiting](https://learn.microsoft.com/en-us/aspnet/core/performance/rate-limit)
- [Security Documentation](../security/RATE_LIMITING.md)
- [API Documentation](../API.md)
