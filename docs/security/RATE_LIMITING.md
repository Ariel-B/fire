# Rate Limiting

## Overview

The FIRE Planning Tool implements rate limiting to protect API endpoints from abuse, ensure fair resource allocation, and prevent potential denial-of-service (DoS) attacks. Rate limiting is implemented using ASP.NET Core 9.0's built-in rate limiting middleware.

## Configuration

Rate limiting is configured in `appsettings.json`:

```json
{
  "RateLimiting": {
    "PermitLimit": 100,
    "WindowSeconds": 60,
    "QueueLimit": 0
  }
}
```

### Configuration Parameters

- **PermitLimit**: Maximum number of requests allowed per time window (default: 100)
- **WindowSeconds**: Time window duration in seconds (default: 60 seconds)
- **QueueLimit**: Number of requests that can be queued when limit is reached (default: 0)

## Implementation Details

### Fixed Window Limiter

The application uses a **Fixed Window** rate limiting strategy:

- Requests are counted within fixed time windows (e.g., 1 minute)
- Each client IP address has its own independent limit
- When the app is behind a trusted reverse proxy, forwarded headers are processed before rate limiting so limits apply to the original client IP instead of the proxy hop
- When the limit is exceeded, requests receive a `429 Too Many Requests` response
- The window resets after the configured duration

### Forwarded Headers And Trusted Proxies

If you deploy behind nginx, Caddy, Traefik, Kubernetes ingress, or a cloud load balancer, configure trusted proxy addresses in `appsettings.json`:

```json
{
  "ForwardedHeaders": {
    "ForwardLimit": 1,
    "KnownProxies": ["127.0.0.1"],
    "KnownNetworks": ["10.0.0.0/8"]
  }
}
```

- `KnownProxies`: explicit proxy or load balancer IPs allowed to set `X-Forwarded-For`
- `KnownNetworks`: CIDR ranges for trusted ingress networks
- `ForwardLimit`: how many proxy hops to trust from the right side of the forwarded chain

The app only rewrites `RemoteIpAddress` from forwarded headers when the immediate sender is trusted. That prevents clients from bypassing rate limits by spoofing `X-Forwarded-For` directly.

### Protected Endpoints

Rate limiting is applied to all API endpoints:

1. **FirePlan Controller** (`/api/fireplan/*`)
   - `POST /api/fireplan/calculate` - Calculate FIRE projections
   - `POST /api/fireplan/save` - Save FIRE plan to JSON
   - `POST /api/fireplan/load` - Load FIRE plan from JSON

2. **AssetPrices Controller** (`/api/assetprices/*`)
   - `GET /api/assetprices/{symbol}` - Get current stock price
   - `POST /api/assetprices/batch` - Get multiple stock prices
   - `GET /api/assetprices/{symbol}/name` - Get company information
   - `GET /api/assetprices/{symbol}/cagr` - Get historical CAGR data

### Global vs. Policy-Based Limiting

The application implements rate limiting at two levels:

1. **Global Limiter**: Applied to all incoming requests by default, partitioned by IP address
2. **Named Policy ("ApiPolicy")**: Applied specifically to API controllers using the `[EnableRateLimiting("ApiPolicy")]` attribute

Both use the same configuration values but can be adjusted independently if needed.

## Rate Limit Responses

When a client exceeds the rate limit:

- **Status Code**: `429 Too Many Requests`
- **Response Body**: Standard error response
- **Headers**: May include `Retry-After` header indicating when to retry

Example response:
```json
{
  "error": "Too many requests. Please try again later."
}
```

## Bypassing Rate Limits (Development)

For local development and testing, you may want to increase the limits:

1. Edit `appsettings.Development.json`:
```json
{
  "RateLimiting": {
    "PermitLimit": 1000,
    "WindowSeconds": 60,
    "QueueLimit": 0
  }
}
```

2. Or disable rate limiting entirely by commenting out the middleware in `src/Program.cs`:
```csharp
// app.UseRateLimiter();
```

**⚠️ Warning**: Never disable rate limiting in production environments.

## Monitoring and Logging

Rate limiting events are automatically logged by ASP.NET Core. Monitor your logs for:

- Frequent 429 responses (may indicate legitimate high load or abuse)
- Patterns of abuse from specific IP addresses
- Performance impact of rate limiting

## Best Practices

### For API Consumers

1. **Implement Retry Logic**: Handle 429 responses gracefully with exponential backoff
2. **Cache Responses**: Cache API responses when possible to reduce request frequency
3. **Batch Requests**: Use batch endpoints (e.g., `/api/assetprices/batch`) when fetching multiple items
4. **Monitor Usage**: Track your API usage to stay within limits

### For Administrators

1. **Adjust Limits Based on Load**: Monitor server resources and adjust limits as needed
2. **Consider Different Limits for Different Endpoints**: Some endpoints may need stricter limits
3. **Implement IP Whitelisting**: For trusted clients, consider exempting from rate limits
4. **Use CDN/Load Balancer**: Distribute load and implement additional DDoS protection

## Security Considerations

Rate limiting provides protection against:

- **Brute Force Attacks**: Limits password guessing and credential stuffing
- **DoS/DDoS Attacks**: Prevents service overwhelming from excessive requests
- **Resource Exhaustion**: Protects server resources (CPU, memory, database connections)
- **API Abuse**: Prevents unfair usage and ensures fair access for all users
- **External API Quota Protection**: Prevents exceeding Finnhub API limits

## Testing

Rate limiting is tested through integration tests in `FirePlanningTool.Tests/Security/RateLimitingTests.cs`:

- Verify 429 responses when limits are exceeded
- Ensure requests within limits succeed
- Confirm proper header inclusion in rate-limited responses
- Test different endpoints independently

Run rate limiting tests:
```bash
dotnet test --filter "FullyQualifiedName~RateLimitingTests"
```

## Troubleshooting

### Issue: Legitimate Users Getting Rate Limited

**Solution**: Increase `PermitLimit` or `WindowSeconds` in configuration

### Issue: Rate Limiting Not Working

**Check**:
1. Verify `UseRateLimiter()` is called in `src/Program.cs`
2. Ensure controllers have `[EnableRateLimiting("ApiPolicy")]` attribute
3. Check configuration values are being loaded correctly

### Issue: Different Behavior in Development vs. Production

**Check**: Ensure `appsettings.Development.json` doesn't override with different values

### Issue: All Users Behind A Proxy Share The Same Rate Limit

**Check**:
1. Confirm the reverse proxy sends `X-Forwarded-For`
2. Add the proxy IP or network to `ForwardedHeaders:KnownProxies` or `ForwardedHeaders:KnownNetworks`
3. Ensure forwarded headers middleware runs before rate limiting in `src/Program.cs`

## Future Enhancements

Potential improvements to consider:

1. **Sliding Window Limiter**: More accurate rate limiting with sliding time windows
2. **Token Bucket Algorithm**: Allow burst traffic while maintaining average rate
3. **Per-User Limits**: Different limits for authenticated vs. anonymous users
4. **Endpoint-Specific Limits**: Stricter limits for expensive operations
5. **Geographic Rate Limiting**: Different limits based on client location
6. **Dynamic Limits**: Adjust limits based on server load

## References

- [ASP.NET Core Rate Limiting](https://learn.microsoft.com/en-us/aspnet/core/performance/rate-limit)
- [RFC 6585 - Additional HTTP Status Codes](https://tools.ietf.org/html/rfc6585#section-4)
- [OWASP API Security - Rate Limiting](https://owasp.org/www-project-api-security/)
