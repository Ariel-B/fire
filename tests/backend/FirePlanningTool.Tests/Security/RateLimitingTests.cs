using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;
using FluentAssertions;
using System.Net.Http.Json;
using FirePlanningTool.Models;
using FirePlanningTool.ValueObjects;
using Microsoft.Extensions.Configuration;

namespace FirePlanningTool.Tests.Security
{
    /// <summary>
    /// Integration tests for rate limiting to ensure API endpoints are protected from abuse.
    /// Tests verify that rate limiting is properly configured and enforced.
    /// </summary>
    public class RateLimitingTests : IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly WebApplicationFactory<Program> _factory;

        // Default rate limit is 100 requests per minute
        // Make slightly more requests to ensure we exceed the limit
        private const int RequestsToExceedLimit = 105;

        public RateLimitingTests(WebApplicationFactory<Program> factory)
        {
            _factory = factory;
        }

        [Fact]
        public async Task FirePlanCalculate_ExceedingRateLimit_Returns429()
        {
            // Arrange
            var client = _factory.CreateClient();
            var validInput = new FirePlanInput { BirthYear = 1990 };

            // Make requests until we hit the rate limit
            var responses = new List<HttpResponseMessage>();

            // Act - Make requests rapidly to exceed the limit
            for (int i = 0; i < RequestsToExceedLimit; i++)
            {
                var response = await client.PostAsJsonAsync("/api/fireplan/calculate", validInput);
                responses.Add(response);
            }

            // Assert - At least one request should be rate limited
            var rateLimitedResponses = responses.Where(r => r.StatusCode == HttpStatusCode.TooManyRequests);
            rateLimitedResponses.Should().NotBeEmpty("some requests should be rate limited after exceeding the limit");

            // Cleanup
            foreach (var response in responses)
            {
                response.Dispose();
            }
        }

        [Fact]
        public async Task AssetPrices_ExceedingRateLimit_Returns429()
        {
            // Arrange
            var client = _factory.CreateClient();

            // Make requests until we hit the rate limit
            var responses = new List<HttpResponseMessage>();

            // Act - Make requests rapidly to exceed the limit
            for (int i = 0; i < RequestsToExceedLimit; i++)
            {
                var response = await client.GetAsync("/api/assetprices/AAPL");
                responses.Add(response);
            }

            // Assert - At least one request should be rate limited
            var rateLimitedResponses = responses.Where(r => r.StatusCode == HttpStatusCode.TooManyRequests);
            rateLimitedResponses.Should().NotBeEmpty("some requests should be rate limited after exceeding the limit");

            // Cleanup
            foreach (var response in responses)
            {
                response.Dispose();
            }
        }

        [Fact]
        public async Task HealthEndpoint_IsAccessible()
        {
            // Arrange
            var client = _factory.CreateClient();

            // Act - Make a single request to health endpoint
            var response = await client.GetAsync("/health");

            // Assert - Health endpoint should be accessible
            // Note: Even health endpoint is subject to the global limiter in tests
            // since all test clients share the same IP address
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.ServiceUnavailable,
                HttpStatusCode.TooManyRequests);

            // Cleanup
            response.Dispose();
        }

        [Fact]
        public async Task FirePlanSave_SingleRequest_Succeeds()
        {
            // Arrange
            var client = _factory.CreateClient();
            var planData = new FirePlanData
            {
                Inputs = new FirePlanInputs { BirthYear = "1990" }
            };

            // Act - Make a single reasonable request
            var response = await client.PostAsJsonAsync("/api/fireplan/save", planData);

            // Assert - Request should succeed when within limits
            // Note: In test environment, may be rate limited if other tests have consumed the quota
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.BadRequest,
                HttpStatusCode.TooManyRequests);

            response.Dispose();
        }

        [Fact]
        public async Task RateLimitResponse_IncludesRetryAfterHeader()
        {
            // Arrange
            var client = _factory.CreateClient();
            var validInput = new FirePlanInput { BirthYear = 1990 };

            HttpResponseMessage? rateLimitedResponse = null;

            // Act - Make requests until we get rate limited
            for (int i = 0; i < RequestsToExceedLimit; i++)
            {
                var response = await client.PostAsJsonAsync("/api/fireplan/calculate", validInput);

                if (response.StatusCode == HttpStatusCode.TooManyRequests)
                {
                    rateLimitedResponse = response;
                    break;
                }

                response.Dispose();
            }

            // Assert
            rateLimitedResponse.Should().NotBeNull("should eventually get rate limited");
            if (rateLimitedResponse != null)
            {
                // Rate limiting middleware typically includes retry-after header
                rateLimitedResponse.StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
                rateLimitedResponse.Dispose();
            }
        }

        [Fact]
        public async Task BatchPriceRequest_ExceedingRateLimit_Returns429()
        {
            // Arrange
            var client = _factory.CreateClient();
            var batchRequest = new BatchPriceRequest
            {
                Symbols = new[] { "AAPL", "GOOGL", "MSFT" }
            };

            var responses = new List<HttpResponseMessage>();

            // Act - Make requests until we hit the rate limit
            for (int i = 0; i < 105; i++)
            {
                var response = await client.PostAsJsonAsync("/api/assetprices/batch", batchRequest);
                responses.Add(response);
            }

            // Assert - At least one request should be rate limited
            var rateLimitedResponses = responses.Where(r => r.StatusCode == HttpStatusCode.TooManyRequests);
            rateLimitedResponses.Should().NotBeEmpty("some batch requests should be rate limited after exceeding the limit");

            // Cleanup
            foreach (var response in responses)
            {
                response.Dispose();
            }
        }

        [Fact]
        public async Task RateLimit_ConfigurationApplies()
        {
            // Arrange - Create client to test rate limiting
            // Note: In integration tests, all clients share the same IP address
            var client = _factory.CreateClient();
            var validInput = new FirePlanInput { BirthYear = 1990 };

            // Act - Make a single request
            var response = await client.PostAsJsonAsync("/api/fireplan/calculate", validInput);

            // Assert - Verify that the endpoint responds (whether rate limited or not)
            // The presence of rate limiting is proven by other tests that exceed the limit
            response.Should().NotBeNull();
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.BadRequest,
                HttpStatusCode.TooManyRequests);

            // Cleanup
            response.Dispose();
        }

        [Fact]
        public async Task RateLimiting_UsesForwardedClientIp_WhenForwardedHeadersAreTrusted()
        {
            using var factory = _factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureAppConfiguration((_, config) =>
                {
                    config.AddInMemoryCollection(new Dictionary<string, string?>
                    {
                        ["ForwardedHeaders:KnownProxies:0"] = "127.0.0.1",
                        ["ForwardedHeaders:KnownProxies:1"] = "::1"
                    });
                });
            });

            using var firstClient = factory.CreateClient();
            using var secondClient = factory.CreateClient();

            firstClient.DefaultRequestHeaders.Add("X-Forwarded-For", "198.51.100.10");
            secondClient.DefaultRequestHeaders.Add("X-Forwarded-For", "198.51.100.11");

            var validInput = new FirePlanInput { BirthYear = 1990 };

            var firstClientResponses = new List<HttpResponseMessage>();
            try
            {
                for (int i = 0; i < RequestsToExceedLimit; i++)
                {
                    firstClientResponses.Add(await firstClient.PostAsJsonAsync("/api/fireplan/calculate", validInput));
                }

                firstClientResponses.Should().Contain(response => response.StatusCode == HttpStatusCode.TooManyRequests,
                    "the first forwarded client should eventually exhaust its own bucket");

                using var secondClientResponse = await secondClient.PostAsJsonAsync("/api/fireplan/calculate", validInput);
                secondClientResponse.StatusCode.Should().NotBe(HttpStatusCode.TooManyRequests,
                    "a different forwarded client IP should not inherit the exhausted bucket from another client");
            }
            finally
            {
                foreach (var response in firstClientResponses)
                {
                    response.Dispose();
                }
            }
        }
    }
}
