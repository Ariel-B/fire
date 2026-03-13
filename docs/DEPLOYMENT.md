# Deployment Guide

This document provides guidance for deploying the FIRE Planning Tool in containerized environments.

## Health Checks

The application exposes a health check endpoint at `/health` that reports the status of the application and its dependencies.

### Health Status Levels

- **Healthy**: All services are operating normally
  - Application is running
  - Finnhub API is accessible and responding with valid data
  
- **Degraded**: Application is running but some services are impaired
  - Application is running
  - Finnhub API key is not configured, or the API is not responding properly
  - The application will continue to function, but real-time stock prices may not be available
  
- **Unhealthy**: Critical failures
  - Application or critical services are not functioning

### HTTP Status Codes

- `200 OK`: Service is Healthy or Degraded
- `503 Service Unavailable`: Service is Unhealthy

## Kubernetes Deployment

### Health Probes

Configure liveness and readiness probes in your Kubernetes deployment manifest:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fire-planning-tool
spec:
  replicas: 2
  selector:
    matchLabels:
      app: fire-planning-tool
  template:
    metadata:
      labels:
        app: fire-planning-tool
    spec:
      containers:
      - name: fire-planning-tool
        image: fire-planning-tool:latest
        ports:
        - containerPort: 5162
          protocol: TCP
        env:
        - name: ASPNETCORE_ENVIRONMENT
          value: "Production"
        - name: Finnhub__ApiKey
          valueFrom:
            secretKeyRef:
              name: finnhub-secret
              key: api-key
        livenessProbe:
          httpGet:
            path: /health
            port: 5162
            scheme: HTTP
          initialDelaySeconds: 10
          periodSeconds: 30
          timeoutSeconds: 5
          successThreshold: 1
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health
            port: 5162
            scheme: HTTP
          initialDelaySeconds: 5
          periodSeconds: 10
          timeoutSeconds: 5
          successThreshold: 1
          failureThreshold: 2
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

### Liveness vs Readiness Probes

- **Liveness Probe**: Determines if the container needs to be restarted
  - Longer `initialDelaySeconds` (10s) to allow application startup
  - Higher `failureThreshold` (3) to avoid unnecessary restarts
  - Longer `periodSeconds` (30s) as frequent checks aren't needed

- **Readiness Probe**: Determines if the container should receive traffic
  - Shorter `initialDelaySeconds` (5s) to start serving traffic quickly
  - Lower `failureThreshold` (2) to quickly stop sending traffic to unhealthy pods
  - Shorter `periodSeconds` (10s) for faster detection of issues

### Creating Secrets

Store sensitive configuration like the Finnhub API key in Kubernetes secrets:

```bash
kubectl create secret generic finnhub-secret \
  --from-literal=api-key='your-api-key-here'
```

## Docker Deployment

### Docker Compose

Example `docker-compose.yml` with health checks:

```yaml
version: '3.8'

services:
  fire-planning-tool:
    image: fire-planning-tool:latest
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "5162:5162"
    environment:
      - ASPNETCORE_ENVIRONMENT=Production
      - Finnhub__ApiKey=${FINNHUB_API_KEY}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5162/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
    restart: unless-stopped
```

### Dockerfile Health Check

Add to your `Dockerfile`:

```dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

# Add curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5162/health || exit 1

EXPOSE 5162
ENTRYPOINT ["dotnet", "FirePlanningTool.dll"]
```

### Environment Variables

Set the Finnhub API key via environment variables:

```bash
# Linux/macOS
export FINNHUB_API_KEY="your-api-key-here"

# Windows PowerShell
$env:FINNHUB_API_KEY="your-api-key-here"

# Docker run
docker run -e Finnhub__ApiKey="your-api-key-here" fire-planning-tool:latest

# Docker Compose
# Create a .env file with:
FINNHUB_API_KEY=your-api-key-here
```

## Monitoring and Alerting

### Health Check Monitoring

Monitor the `/health` endpoint to detect issues:

```bash
# Simple monitoring script
while true; do
  STATUS=$(curl -s http://localhost:5162/health)
  TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
  echo "[$TIMESTAMP] Health Status: $STATUS"
  
  if [ "$STATUS" != "Healthy" ]; then
    echo "⚠️  WARNING: Service is not healthy!"
    # Send alert (e.g., email, Slack, PagerDuty)
  fi
  
  sleep 60
done
```

### Kubernetes Service Monitor (Prometheus)

If using Prometheus for monitoring:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: fire-planning-tool
  labels:
    app: fire-planning-tool
spec:
  type: ClusterIP
  ports:
  - port: 5162
    targetPort: 5162
    protocol: TCP
    name: http
  selector:
    app: fire-planning-tool
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: fire-planning-tool
spec:
  selector:
    matchLabels:
      app: fire-planning-tool
  endpoints:
  - port: http
    path: /health
    interval: 30s
```

## Troubleshooting

### Health Check Returns "Degraded"

This typically means the Finnhub API key is not configured or the API is not responding:

1. **Check API Key Configuration**:
   ```bash
   # Kubernetes
   kubectl get secret finnhub-secret -o yaml
   
   # Docker
   docker exec <container-id> printenv | grep Finnhub
   ```

2. **Verify API Connectivity**:
   ```bash
   # Test from within the container
   kubectl exec -it <pod-name> -- curl "https://finnhub.io/api/v1/quote?symbol=SPY&token=<your-key>"
   ```

3. **Check Logs**:
   ```bash
   # Kubernetes
   kubectl logs <pod-name>
   
   # Docker
   docker logs <container-id>
   ```

### Health Check Returns "Unhealthy"

This indicates a critical failure:

1. Check application logs for exceptions
2. Verify the application can start properly
3. Check resource constraints (CPU, memory)
4. Verify network connectivity to dependencies

## Best Practices

1. **Always configure health checks** in production deployments
2. **Set appropriate timeouts** based on your application's startup time
3. **Monitor health check failures** and set up alerts
4. **Use readiness probes** to prevent traffic to unhealthy pods
5. **Configure resource limits** to prevent resource exhaustion
6. **Store secrets securely** using Kubernetes secrets or a secrets manager
7. **Test health checks** during deployment validation

## Additional Resources

- [Kubernetes Liveness and Readiness Probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [Docker Health Check Documentation](https://docs.docker.com/engine/reference/builder/#healthcheck)
- [ASP.NET Core Health Checks](https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/health-checks)
