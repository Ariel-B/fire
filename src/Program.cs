using FirePlanningTool.Serialization;
using FirePlanningTool.Services;
using FirePlanningTool.Services.Strategies;
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Mvc;
using System.Net;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

// Load user secrets in development environment
if (builder.Environment.IsDevelopment())
{
    builder.Configuration.AddUserSecrets("fire-planning-tool-dev");
}

// Configure Finnhub settings from configuration (includes user secrets in development)
builder.Services.Configure<FinnhubConfiguration>(options =>
{
    options.ApiKey = builder.Configuration["Finnhub:ApiKey"] ?? string.Empty;
    options.BaseUrl = builder.Configuration["Finnhub:BaseUrl"] ?? "https://finnhub.io/api/v1";
});

// Configure Exchange Rate service settings
builder.Services.Configure<ExchangeRateConfiguration>(options =>
{
    options.ApiKey = builder.Configuration["ExchangeRate:ApiKey"] ?? string.Empty;
    options.BaseUrl = builder.Configuration["ExchangeRate:BaseUrl"] ?? "https://api.exchangerate.host";
    options.CacheMinutes = builder.Configuration.GetValue<int>("ExchangeRate:CacheMinutes", 60);
});

// Load asset names configuration from JSON file
builder.Configuration.AddJsonFile("etf-names.json", optional: false, reloadOnChange: true);
builder.Services.Configure<FirePlanningTool.Models.AssetNamesConfiguration>(
    builder.Configuration);

// Add services to the container
builder.Services.AddControllers()
    .ConfigureApiBehaviorOptions(options =>
    {
        // Customize model state validation errors to use ApiErrorResponse format
        options.InvalidModelStateResponseFactory = context =>
        {
            var errors = string.Join("; ", context.ModelState.Values
                .SelectMany(v => v.Errors)
                .Select(e => e.ErrorMessage));

            return new BadRequestObjectResult(new FirePlanningTool.Models.ApiErrorResponse(errors));
        };
    })
    .AddJsonOptions(options =>
    {
        // Set maximum JSON depth to prevent deeply nested JSON attacks
        options.JsonSerializerOptions.MaxDepth = 32;

        // Add string enum converter to handle enum serialization from JSON strings
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());

        // Add Money type converter for type-safe currency handling
        options.JsonSerializerOptions.Converters.Add(new MoneyJsonConverter());
    });

// Add FluentValidation
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblyContaining<Program>();

// Configure request size limits
builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 10_485_760; // 10MB limit for multipart forms
});

builder.Services.AddMemoryCache();
builder.Services.AddScoped<ICurrencyConverter, CurrencyConverter>();
builder.Services.AddScoped<IPortfolioCalculator, PortfolioCalculator>();
builder.Services.AddScoped<IRsuCalculator, RsuCalculator>();
builder.Services.AddScoped<IExcelExportService, ExcelExportService>();

// Register return calculation strategies from shared configuration
foreach (var strategyType in CalculationConstants.GetReturnCalculationStrategyTypes())
{
    builder.Services.AddSingleton(typeof(IReturnCalculationStrategy), strategyType);
}
builder.Services.AddSingleton<IReturnCalculationStrategyFactory, ReturnCalculationStrategyFactory>();

builder.Services.AddScoped<IPortfolioGrowthCalculator, PortfolioGrowthCalculator>();
builder.Services.AddScoped<ITaxCalculator, TaxCalculator>();
builder.Services.AddScoped<IExpenseCalculator, ExpenseCalculator>();
builder.Services.AddScoped<IAccumulationPhaseCalculator, AccumulationPhaseCalculator>();
builder.Services.AddScoped<IRetirementPhaseCalculator, RetirementPhaseCalculator>();
builder.Services.AddScoped<IFireCalculator, FireCalculator>();
builder.Services.AddHttpClient<FirePlanningTool.Repositories.IAssetDataRepository, FirePlanningTool.Repositories.FinnhubAssetDataRepository>();
builder.Services.AddScoped<IFinnhubService, FinnhubService>();

// Register Exchange Rate Service with HttpClient
builder.Services.AddHttpClient<IExchangeRateService, ExchangeRateService>();

// Register Inflation Data Service with HttpClient
builder.Services.AddHttpClient<IInflationDataService, InflationDataService>();

// Add health checks
builder.Services.AddHealthChecks()
    .AddCheck<FinnhubHealthCheck>("finnhub", tags: new[] { "external", "api" });

// Process X-Forwarded-* headers from trusted proxies before rate limiting.
var forwardedHeadersConfig = builder.Configuration.GetSection("ForwardedHeaders");
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.ForwardLimit = forwardedHeadersConfig.GetValue<int?>("ForwardLimit") ?? 1;
    options.RequireHeaderSymmetry = forwardedHeadersConfig.GetValue<bool>("RequireHeaderSymmetry", false);

    foreach (var knownProxy in forwardedHeadersConfig.GetSection("KnownProxies").Get<string[]>() ?? Array.Empty<string>())
    {
        if (IPAddress.TryParse(knownProxy, out var proxyAddress))
        {
            options.KnownProxies.Add(proxyAddress);
        }
    }

    foreach (var knownNetwork in forwardedHeadersConfig.GetSection("KnownNetworks").Get<string[]>() ?? Array.Empty<string>())
    {
        if (TryParseIpNetwork(knownNetwork, out var network))
        {
            options.KnownNetworks.Add(network);
        }
    }
});

// Configure rate limiting
var rateLimitConfig = builder.Configuration.GetSection("RateLimiting");
var permitLimit = rateLimitConfig.GetValue<int>("PermitLimit", 100);
var windowSeconds = rateLimitConfig.GetValue<int>("WindowSeconds", 60);
var queueLimit = rateLimitConfig.GetValue<int>("QueueLimit", 0);

// Helper method to create consistent rate limiter options
FixedWindowRateLimiterOptions CreateRateLimiterOptions() => new()
{
    PermitLimit = permitLimit,
    Window = TimeSpan.FromSeconds(windowSeconds),
    QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
    QueueLimit = queueLimit
};

string GetRateLimitPartitionKey(HttpContext httpContext) =>
    httpContext.Connection.RemoteIpAddress?.MapToIPv6().ToString() ?? "unknown";

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    // Fixed window limiter policy for API endpoints only (exclude static files)
    options.AddPolicy("ApiPolicy", httpContext =>
    {
        var path = httpContext.Request.Path.Value ?? "";
        // Exclude static files (js, css, images, etc.) from rate limiting
        if (path.StartsWith("/js/") || path.StartsWith("/css/") || path.StartsWith("/images/") || path.StartsWith("/fonts/") || path.StartsWith("/favicon") || path.StartsWith("/assets/") || path.StartsWith("/static/") || path.StartsWith("/vendor/"))
        {
            return RateLimitPartition.GetNoLimiter("static");
        }
        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: GetRateLimitPartitionKey(httpContext),
            factory: _ => CreateRateLimiterOptions());
    });

    // Global limiter for all requests (applied by default, but exclude static files)
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
    {
        var path = httpContext.Request.Path.Value ?? "";
        if (path.StartsWith("/js/") || path.StartsWith("/css/") || path.StartsWith("/images/") || path.StartsWith("/fonts/") || path.StartsWith("/favicon") || path.StartsWith("/assets/") || path.StartsWith("/static/") || path.StartsWith("/vendor/"))
        {
            return RateLimitPartition.GetNoLimiter("static");
        }
        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: GetRateLimitPartitionKey(httpContext),
            factory: _ => CreateRateLimiterOptions());
    });
});

// Configure CORS - restrict to localhost in development, specific origins in production
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        if (builder.Environment.IsDevelopment())
        {
            // In development, allow localhost with various ports
            policy.WithOrigins(
                "http://localhost:5162",
                "https://localhost:5162",
                "http://localhost:5000",
                "https://localhost:5001"
            )
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials();
        }
        else
        {
            // In production, configure specific allowed origins from configuration
            var allowedOrigins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>()
                ?? Array.Empty<string>();

            if (allowedOrigins.Length > 0)
            {
                policy.WithOrigins(allowedOrigins)
                    .WithMethods("GET", "POST")
                    .WithHeaders("Content-Type", "Accept")
                    .AllowCredentials();
            }
        }
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}

app.UseForwardedHeaders();

app.UseCors();

// Add security headers
app.Use(async (context, next) =>
{
    // Enforce HTTPS and prevent protocol downgrade attacks (production only —
    // avoid breaking local development over plain HTTP)
    if (!app.Environment.IsDevelopment())
    {
        context.Response.Headers.Append("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }

    // Prevent clickjacking
    context.Response.Headers.Append("X-Frame-Options", "SAMEORIGIN");

    // Prevent MIME type sniffing
    context.Response.Headers.Append("X-Content-Type-Options", "nosniff");

    // Enable XSS protection
    context.Response.Headers.Append("X-XSS-Protection", "1; mode=block");

    // Referrer policy
    context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");

    var requestPath = context.Request.Path.Value ?? string.Empty;
    var skipCsp = requestPath.StartsWith("/tests/", StringComparison.OrdinalIgnoreCase)
        || requestPath.Equals("/currency-conversion-tests.html", StringComparison.OrdinalIgnoreCase)
        || requestPath.Equals("/test-d3.html", StringComparison.OrdinalIgnoreCase);

    if (!skipCsp && app.Environment.IsDevelopment())
    {
        context.Response.Headers["Content-Security-Policy"] =
            "default-src 'self'; " +
            "script-src 'self'; " +
            // Chart.js internally sets inline styles on canvas elements for responsive
            // sizing. There is no configuration to disable this behaviour, so we must
            // allow 'unsafe-inline' for style-src.
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data:; " +
            "font-src 'self' data:; " +
            "connect-src 'self'; " +
            "object-src 'none'; " +
            "base-uri 'self'; " +
            "form-action 'self'; " +
            "frame-ancestors 'self'";
    }
    else if (!skipCsp)
    {
        context.Response.Headers["Content-Security-Policy"] =
            "default-src 'self'; " +
            "script-src 'self'; " +
            // Chart.js internally sets inline styles on canvas elements for responsive
            // sizing. There is no configuration to disable this behaviour, so we must
            // allow 'unsafe-inline' for style-src.
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data:; " +
            "font-src 'self' data:; " +
            "connect-src 'self'; " +
            "object-src 'none'; " +
            "base-uri 'self'; " +
            "form-action 'self'; " +
            "frame-ancestors 'self'";
    }

    await next();
});

app.UseRouting();

// Enable rate limiting middleware
app.UseRateLimiter();

// Configure static files with no-cache headers for development
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = ctx =>
    {
        // Disable caching for static files in development
        if (app.Environment.IsDevelopment())
        {
            ctx.Context.Response.Headers.Append("Cache-Control", "no-cache, no-store, must-revalidate");
            ctx.Context.Response.Headers.Append("Pragma", "no-cache");
            ctx.Context.Response.Headers.Append("Expires", "0");
        }
    }
});

app.MapControllers();

// Map health check endpoints
app.MapHealthChecks("/health");

// Serve the main page
app.MapGet("/", () => Results.Redirect("/index.html"));

app.Run();

static bool TryParseIpNetwork(string value, out Microsoft.AspNetCore.HttpOverrides.IPNetwork network)
{
    network = default!;

    var parts = value.Split('/', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
    if (parts.Length != 2 || !IPAddress.TryParse(parts[0], out var prefix) || !int.TryParse(parts[1], out var prefixLength))
    {
        return false;
    }

    var maxPrefixLength = prefix.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork ? 32 : 128;
    if (prefixLength < 0 || prefixLength > maxPrefixLength)
    {
        return false;
    }

    network = new Microsoft.AspNetCore.HttpOverrides.IPNetwork(prefix, prefixLength);
    return true;
}

/// <summary>
/// Program class made accessible to integration tests through partial class declaration.
/// </summary>
public partial class Program { }
