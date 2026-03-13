namespace FirePlanningTool.Tests.Sample
{
    public class SampleTests
    {
        [Fact]
        public void SampleTest_BasicAssertion_Passes()
        {
            // Arrange
            var expected = 2;
            var actual = 1 + 1;

            // Act & Assert
            actual.Should().Be(expected);
        }
    }
}
