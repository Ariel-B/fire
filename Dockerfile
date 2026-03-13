# Stage 1: Build TypeScript
FROM node:20-alpine AS frontend-build
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies and compile TypeScript
RUN npm ci
COPY wwwroot/ts ./wwwroot/ts
RUN npx tsc

# Stage 2: Build .NET application
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS backend-build
WORKDIR /src

# Copy csproj and restore dependencies
COPY *.csproj ./
RUN dotnet restore

# Copy source code and build
COPY . .
RUN dotnet build FirePlanningTool.csproj -c Release -o /app/build

# Publish the application
RUN dotnet publish FirePlanningTool.csproj -c Release -o /app/publish /p:UseAppHost=false

# Stage 3: Runtime image
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app

# Install curl for healthcheck
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy published application
COPY --from=backend-build /app/publish .

# Copy compiled JavaScript from frontend build stage
COPY --from=frontend-build /app/wwwroot/js ./wwwroot/js

# Create a non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8080

# Environment variables
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8080/ || exit 1

# Start the application
ENTRYPOINT ["dotnet", "FirePlanningTool.dll"]
