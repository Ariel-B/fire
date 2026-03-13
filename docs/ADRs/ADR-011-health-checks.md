# ADR-011: Health Checks for Deployment

**Status**: Accepted

**Date**: 2024-11

**Deciders**: DevOps Team, Development Team

**Technical Story**: Kubernetes and Docker deployment readiness

## Context

The FIRE Planning Tool needed to be deployed in containerized environments (Docker, Kubernetes) requiring:
- Container orchestration health monitoring
- Automatic restart of unhealthy containers
- Load balancer readiness determination
- Dependency health validation (Finnhub API)
- Graceful degradation when dependencies fail

Without health checks:
- Kubernetes can't determine if pods are healthy
- Failed deployments not automatically recovered
- Traffic sent to unhealthy instances
- Manual intervention required for recovery

## Decision

Implement **ASP.NET Core Health Checks** with custom checks for external dependencies, exposed at `/health` endpoint.

### Implementation:

```csharp
// Register health checks
builder.Services.AddHealthChecks()
    .AddCheck<FinnhubHealthCheck>("finnhub", tags: new[] { "external", "api" });

// Map health endpoint
app.MapHealthChecks("/health");
```

### FinnhubHealthCheck:

```csharp
public class FinnhubHealthCheck : IHealthCheck
{
    private readonly IFinnhubService _finnhubService;
    
    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context, 
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Try to fetch a known stock price
            var price = await _finnhubService.GetStockPriceAsync("AAPL");
            
            return price.HasValue 
                ? HealthCheckResult.Healthy("Finnhub API is accessible")
                : HealthCheckResult.Degraded("Finnhub API key may be invalid or API is unavailable");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Degraded(
                "Finnhub API is unavailable", ex);
        }
    }
}
```

### Response Codes:
- **200 OK** with "Healthy" - All services operational
- **200 OK** with "Degraded" - Application runs but dependencies unavailable
- **503 Service Unavailable** with "Unhealthy" - Critical failure

## Consequences

### Positive
- **Automated Recovery**: Kubernetes restarts unhealthy pods automatically
- **Zero-Downtime Deployments**: Traffic only to healthy instances
- **Dependency Monitoring**: Validates external API connectivity
- **Graceful Degradation**: Can operate with degraded dependencies
- **Operational Visibility**: Health status at a glance
- **Standards Compliance**: Follows cloud-native patterns

### Negative
- **False Positives**: Transient failures may cause unnecessary restarts
- **Configuration Complexity**: Need proper thresholds in Kubernetes

### Neutral
- **Standard Pattern**: Expected in containerized deployments

## Alternatives Considered

### Alternative 1: No Health Checks
**Description**: Rely on process monitoring only

**Pros**:
- Simple
- No additional code

**Cons**:
- Kubernetes can't determine application health
- No dependency validation
- Manual recovery required
- Poor cloud-native integration

**Why not chosen**: Unacceptable for production containerized deployments.

### Alternative 2: Simple HTTP 200 Check
**Description**: Return 200 OK without validation

**Pros**:
- Very simple
- Fast response

**Cons**:
- Doesn't validate dependencies
- Can't detect degraded state
- False healthy status

**Why not chosen**: Doesn't provide meaningful health information.

### Alternative 3: External Health Check Service
**Description**: Separate service monitors health

**Pros**:
- Centralized monitoring
- Advanced features

**Cons**:
- Additional infrastructure
- External dependency
- More complexity
- Not standard for Kubernetes

**Why not chosen**: Kubernetes has built-in health check support. No need for external service.

## Implementation Notes

Kubernetes Liveness Probe:

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 30
  timeoutSeconds: 5
  failureThreshold: 3
```

Kubernetes Readiness Probe:

```yaml
readinessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 2
```

Docker Health Check:

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1
```

Testing:

```bash
# Check health
curl http://localhost:5162/health

# Expected responses:
# Healthy - All dependencies working
# Degraded - Application works, Finnhub unavailable
```

## References

- [FinnhubHealthCheck.cs](../../src/Services/FinnhubHealthCheck.cs)
- [Program.cs](../../src/Program.cs)
- [API Documentation](../API.md#health-check)
- [Dockerfile](../../Dockerfile)
- [ASP.NET Core Health Checks](https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/health-checks)
