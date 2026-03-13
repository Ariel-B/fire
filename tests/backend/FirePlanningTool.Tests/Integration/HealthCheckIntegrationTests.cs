using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;
using FluentAssertions;

namespace FirePlanningTool.Tests.Integration
{
    /// <summary>
    /// Integration tests for health check endpoints.
    /// Verifies that the health endpoint is properly configured and accessible.
    /// </summary>
    public class HealthCheckIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly WebApplicationFactory<Program> _factory;

        public HealthCheckIntegrationTests(WebApplicationFactory<Program> factory)
        {
            _factory = factory;
        }

        [Fact]
        public async Task HealthEndpoint_IsAccessible()
        {
            // Arrange
            var client = _factory.CreateClient();

            // Act
            var response = await client.GetAsync("/health");

            // Assert
            // The endpoint should be accessible and return a valid health status
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.ServiceUnavailable
            );
            
            var content = await response.Content.ReadAsStringAsync();
            content.Should().NotBeNullOrWhiteSpace();
            content.Should().BeOneOf("Healthy", "Degraded", "Unhealthy");
        }

        [Fact]
        public async Task HealthEndpoint_IsAccessibleWithoutAuthentication()
        {
            // Arrange
            var client = _factory.CreateClient();

            // Act
            var response = await client.GetAsync("/health");

            // Assert
            // Should return a response (not 401 Unauthorized)
            response.StatusCode.Should().NotBe(HttpStatusCode.Unauthorized);
            response.StatusCode.Should().BeOneOf(
                HttpStatusCode.OK,
                HttpStatusCode.ServiceUnavailable
            );
        }

        [Fact]
        public async Task HealthEndpoint_ReturnsValidContentType()
        {
            // Arrange
            var client = _factory.CreateClient();

            // Act
            var response = await client.GetAsync("/health");

            // Assert
            response.Content.Headers.ContentType?.MediaType.Should().Be("text/plain");
        }
    }
}
