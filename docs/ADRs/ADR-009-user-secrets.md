# ADR-009: User Secrets for Local Development

**Status**: Accepted

**Date**: 2024-11

**Deciders**: Development Team, Security Team

**Technical Story**: Secure API key management for local development

## Context

The FIRE Planning Tool integrates with Finnhub API, requiring an API key for accessing stock price data. This raised several concerns:

- **Security**: API keys must never be committed to version control
- **Developer Experience**: Developers need easy local configuration
- **Consistency**: Same configuration approach across team members
- **Production Safety**: Development secrets shouldn't reach production
- **Simplicity**: Minimal setup complexity for new developers

Traditional approaches like `.env` files or hardcoded keys had significant risks:
- Easy to accidentally commit to Git
- Shared secrets across team members
- No encryption at rest
- Platform-specific challenges

## Decision

Use **.NET User Secrets** for local development API key storage, with environment variables for production deployments.

### Implementation:

1. **Local Development**: .NET User Secrets
   - Secrets stored outside project directory
   - Encrypted at rest in user profile
   - Per-user configuration
   - Not committed to Git
   - Access via `dotnet user-secrets` command

2. **Production**: Environment Variables
   - Kubernetes Secrets
   - Docker Secrets
   - Cloud provider secret management
   - CI/CD environment variables

3. **Configuration Loading** (src/Program.cs):
   ```csharp
   if (builder.Environment.IsDevelopment())
   {
       builder.Configuration.AddUserSecrets("fire-planning-tool-dev");
   }
   ```

### User Secrets ID:
```xml
<!-- In FirePlanningTool.csproj -->
<UserSecretsId>fire-planning-tool-dev</UserSecretsId>
```

## Consequences

### Positive
- **Security**: Secrets never in source control
- **Developer-Friendly**: Simple commands for setup
- **Isolated**: Each developer has their own secrets
- **Safe Defaults**: Impossible to accidentally commit
- **Cross-Platform**: Works on Windows, Linux, macOS
- **Production-Ready**: Clear separation from production secrets
- **Well-Documented**: Built-in .NET feature with good docs

### Negative
- **Local Only**: Doesn't work for production (by design)
- **Per-Machine**: Must configure on each development machine
- **Manual Setup**: Developers must run setup commands

### Neutral
- **.NET Specific**: Only works with .NET applications
- **File-Based**: Stored as JSON in user profile

## Alternatives Considered

### Alternative 1: .env Files
**Description**: Store secrets in `.env` file at project root

**Pros**:
- Simple to use
- Language-agnostic
- Easy to share examples

**Cons**:
- Easy to commit accidentally (even with .gitignore)
- Not encrypted
- Shared secrets across team
- Must remember to add to .gitignore
- No built-in .NET support

**Why not chosen**: High risk of accidental commits. User secrets are safer by design.

### Alternative 2: appsettings.Development.json
**Description**: Store secrets in development config file

**Pros**:
- Native .NET configuration
- Easy to use
- No special tools needed

**Cons**:
- File is in project directory (can be committed)
- Not encrypted
- Explicitly excluded in .gitignore (can be forgotten)
- Security risk if committed

**Why not chosen**: Too easy to accidentally commit secrets to Git.

### Alternative 3: Environment Variables Only
**Description**: Use environment variables for all environments

**Pros**:
- Simple concept
- Works everywhere
- No special tooling

**Cons**:
- Platform-specific setup
- Hard to manage multiple projects
- Must set for each terminal session
- No encryption
- Visible in process list

**Why not chosen**: Poor developer experience and not persistent across sessions.

### Alternative 4: Azure Key Vault / AWS Secrets Manager (for dev)
**Description**: Use cloud secret management for all environments

**Pros**:
- Centralized management
- Encrypted
- Audit logging
- Access control

**Cons**:
- Requires cloud account for development
- Network latency
- Cost for development use
- Overkill for local development
- Requires internet connection

**Why not chosen**: Too complex and costly for local development. Better suited for production only.

### Alternative 5: HashiCorp Vault
**Description**: Self-hosted secret management

**Pros**:
- Powerful features
- Centralized
- Access control
- Audit logs

**Cons**:
- Complex setup
- Infrastructure required
- Overkill for small team
- Learning curve

**Why not chosen**: Excessive complexity for project size. User secrets sufficient for local dev.

## Implementation Notes

### Initial Setup (One-Time):

```bash
# Navigate to project directory
cd fire

# Initialize user secrets with project ID
dotnet user-secrets init

# Set Finnhub API key
dotnet user-secrets set "Finnhub:ApiKey" "your_api_key_here"

# Verify secrets
dotnet user-secrets list
```

### Storage Location:

**Windows**: `%APPDATA%\Microsoft\UserSecrets\fire-planning-tool-dev\secrets.json`

**Linux/macOS**: `~/.microsoft/usersecrets/fire-planning-tool-dev/secrets.json`

### Configuration Access:

```csharp
// In src/Program.cs
builder.Services.Configure<FinnhubConfiguration>(options =>
{
    options.ApiKey = builder.Configuration["Finnhub:ApiKey"] ?? string.Empty;
    options.BaseUrl = builder.Configuration["Finnhub:BaseUrl"] ?? "https://finnhub.io/api/v1";
});

// In service
public class FinnhubService
{
    private readonly FinnhubConfiguration _config;
    
    public FinnhubService(IOptions<FinnhubConfiguration> config)
    {
        _config = config.Value;
        // Use _config.ApiKey
    }
}
```

### Production Configuration:

```bash
# Docker
docker run -e Finnhub__ApiKey="production_key" myapp

# Kubernetes
kubectl create secret generic finnhub-secret --from-literal=apikey=production_key

# Azure App Service
az webapp config appsettings set --name myapp --resource-group mygroup \
  --settings Finnhub__ApiKey=production_key
```

### Security Best Practices:

1. **Never log secrets**: Avoid logging configuration values
2. **Rotate regularly**: Change API keys periodically
3. **Least privilege**: Use read-only API keys where possible
4. **Monitor usage**: Track API key usage for anomalies
5. **Separate keys**: Different keys for dev/staging/production

### Documentation:

The `.env.example` file provides a template without actual secrets:

```
# .env.example
FINNHUB_API_KEY=your_api_key_here
```

CONTRIBUTING.md includes setup instructions:

```markdown
## Configure your Finnhub API Key

dotnet user-secrets init
dotnet user-secrets set "Finnhub:ApiKey" "your_api_key_here"
```

## References

- [.NET User Secrets Documentation](https://docs.microsoft.com/en-us/aspnet/core/security/app-secrets)
- [Program.cs](../../src/Program.cs)
- [FirePlanningTool.csproj](../../FirePlanningTool.csproj)
- [CONTRIBUTING.md](../CONTRIBUTING.md)
- [.env.example](../../.env.example)
