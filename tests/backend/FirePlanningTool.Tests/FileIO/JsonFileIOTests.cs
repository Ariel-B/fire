namespace FirePlanningTool.Tests.FileIO
{
    using FirePlanningTool.Models;
    using FirePlanningTool.ValueObjects;
    using FirePlanningTool.Serialization;
    using System.Text.Json;

    /// <summary>
    /// Tests for JSON file I/O operations
    /// Validates serialization, deserialization, and persistence
    /// </summary>
    public class JsonFileIOTests
    {
        private const string TestFileName = "test_plan.json";
        private readonly string _testDirectory = Path.Combine(Path.GetTempPath(), "FirePlanTests");
        private readonly JsonSerializerOptions _jsonOptions;

        public JsonFileIOTests()
        {
            if (!Directory.Exists(_testDirectory))
            {
                Directory.CreateDirectory(_testDirectory);
            }
            _jsonOptions = new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                WriteIndented = true
            };
            _jsonOptions.Converters.Add(new MoneyJsonConverter());
        }

        #region Serialization Tests

        [Fact]
        public void SerializeFirePlanInput_ValidInput_ProducesValidJson()
        {
            // Arrange
            var input = new FirePlanInput
            {
                AccumulationPortfolio = new List<PortfolioAsset>
                {
                    new() { Symbol = "VTI", Quantity = 100, CurrentPrice = Money.Usd(250), AverageCost = Money.Usd(200) }
                },
                Expenses = new List<PlannedExpense>(),
                BirthYear = 1990,
                EarlyRetirementYear = 2025,
                FullRetirementAge = 65,
                MonthlyContribution = Money.Usd(2000),
            };

            // Act
            var json = JsonSerializer.Serialize(input, _jsonOptions);

            // Assert
            json.Should().NotBeNullOrEmpty();
            json.Should().Contain("VTI");
            json.Should().Contain("accumulationPortfolio");
        }

        [Fact]
        public void SerializePortfolioAsset_AllProperties_SerializesCorrectly()
        {
            // Arrange
            var asset = new PortfolioAsset
            {
                Symbol = "VTI",
                Quantity = 100,
                CurrentPrice = Money.Usd(250),
                AverageCost = Money.Usd(200),
            };

            // Act
            var json = JsonSerializer.Serialize(asset, _jsonOptions);

            // Assert (WriteIndented = true adds a space after colon)
            json.Should().Contain("\"symbol\": \"VTI\"");
            json.Should().Contain("100");
            json.Should().Contain("250");
        }

        [Fact]
        public void SerializePlannedExpense_WithRepetition_SerializesCorrectly()
        {
            // Arrange
            var expense = new PlannedExpense
            {
                Type = "Vacation",
                NetAmount = Money.Usd(5000),
                RepetitionCount = 3
            };

            // Act
            var json = JsonSerializer.Serialize(expense, _jsonOptions);

            // Assert
            json.Should().Contain("Vacation");
            json.Should().Contain("5000");
            json.Should().Contain("3");
        }

        #endregion

        #region Deserialization Tests

        [Fact]
        public void DeserializeFirePlanInput_ValidJson_ProducesCorrectObject()
        {
            // Arrange - Uses new Money JSON format
            var json = @"{
                ""accumulationPortfolio"": [{
                    ""symbol"": ""VTI"",
                    ""quantity"": 100,
                    ""currentPrice"": { ""amount"": 250, ""currency"": ""USD"" },
                    ""averageCost"": { ""amount"": 200, ""currency"": ""USD"" }
                }],
                ""expenses"": [],
                ""birthYear"": 1990,
                ""earlyRetirementYear"": 2025,
                ""fullRetirementAge"": 65,
                ""monthlyContribution"": { ""amount"": 2000, ""currency"": ""USD"" }
            }";

            // Act
            var input = JsonSerializer.Deserialize<FirePlanInput>(json, _jsonOptions);

            // Assert
            input.Should().NotBeNull();
            input!.AccumulationPortfolio.Should().HaveCount(1);
            input.AccumulationPortfolio[0].Symbol.Should().Be("VTI");
            input.BirthYear.Should().Be(1990);
        }

        [Fact]
        public void DeserializePortfolioAsset_ValidJson_ProducesCorrectObject()
        {
            // Arrange - Uses new Money JSON format
            var json = @"{
                ""symbol"": ""BND"",
                ""quantity"": 50,
                ""currentPrice"": { ""amount"": 100, ""currency"": ""USD"" },
                ""averageCost"": { ""amount"": 95, ""currency"": ""USD"" }
            }";

            // Act
            var asset = JsonSerializer.Deserialize<PortfolioAsset>(json, _jsonOptions);

            // Assert
            asset.Should().NotBeNull();
            asset!.Symbol.Should().Be("BND");
            asset.Quantity.Should().Be(50);
        }

        #endregion

        #region Round-Trip Tests

        [Fact]
        public void SerializeDeserialize_FirePlanInput_PreservesData()
        {
            // Arrange
            var original = new FirePlanInput
            {
                AccumulationPortfolio = new List<PortfolioAsset>
                {
                    new() { Symbol = "VTI", Quantity = 100, CurrentPrice = Money.Usd(250), AverageCost = Money.Usd(200) }
                },
                Expenses = new List<PlannedExpense>
                {
                    new() { Type = "Vacation", NetAmount = Money.Usd(5000) }
                },
                BirthYear = 1990,
                EarlyRetirementYear = 2025,
                FullRetirementAge = 65,
                MonthlyContribution = Money.Usd(2000),
            };

            // Act
            var json = JsonSerializer.Serialize(original, _jsonOptions);
            var deserialized = JsonSerializer.Deserialize<FirePlanInput>(json, _jsonOptions);

            // Assert
            deserialized.Should().NotBeNull();
            deserialized!.BirthYear.Should().Be(original.BirthYear);
            deserialized.AccumulationPortfolio.Should().HaveCount(1);
            deserialized.Expenses.Should().HaveCount(1);
        }

        [Fact]
        public void SerializeDeserialize_ComplexPortfolio_PreservesAllAssets()
        {
            // Arrange
            var original = new FirePlanInput
            {
                AccumulationPortfolio = new List<PortfolioAsset>
                {
                    new() { Symbol = "VTI", Quantity = 100, CurrentPrice = Money.Usd(250), AverageCost = Money.Usd(200) },
                    new() { Symbol = "BND", Quantity = 50, CurrentPrice = Money.Usd(80), AverageCost = Money.Usd(75) },
                    new() { Symbol = "VXUS", Quantity = 75, CurrentPrice = Money.Usd(60), AverageCost = Money.Usd(55) }
                },
                Expenses = new List<PlannedExpense>(),
                BirthYear = 1990,
                EarlyRetirementYear = 2025,
                FullRetirementAge = 65,
                MonthlyContribution = Money.Usd(2000),
            };

            // Act
            var json = JsonSerializer.Serialize(original, _jsonOptions);
            var deserialized = JsonSerializer.Deserialize<FirePlanInput>(json, _jsonOptions);

            // Assert
            deserialized.Should().NotBeNull();
            deserialized!.AccumulationPortfolio.Should().HaveCount(3);
            deserialized.AccumulationPortfolio[0].Symbol.Should().Be("VTI");
            deserialized.AccumulationPortfolio[2].Symbol.Should().Be("VXUS");
        }

        #endregion

        #region File I/O Tests

        [Fact]
        public void SaveToFile_ValidInput_CreatesJsonFile()
        {
            // Arrange
            var input = new FirePlanInput
            {
                AccumulationPortfolio = new List<PortfolioAsset>
                {
                    new() { Symbol = "VTI", Quantity = 100, CurrentPrice = Money.Usd(250), AverageCost = Money.Usd(200) }
                },
                Expenses = new List<PlannedExpense>(),
                BirthYear = 1990,
                EarlyRetirementYear = 2025,
                FullRetirementAge = 65,
                MonthlyContribution = Money.Usd(2000),
            };

            var filePath = Path.Combine(_testDirectory, TestFileName);

            try
            {
                // Act
                var json = JsonSerializer.Serialize(input, _jsonOptions);
                File.WriteAllText(filePath, json);

                // Assert
                File.Exists(filePath).Should().BeTrue();
                var content = File.ReadAllText(filePath);
                content.Should().Contain("VTI");
            }
            finally
            {
                if (File.Exists(filePath)) File.Delete(filePath);
            }
        }

        [Fact]
        public void LoadFromFile_ValidJsonFile_DeserializesCorrectly()
        {
            // Arrange
            var input = new FirePlanInput
            {
                AccumulationPortfolio = new List<PortfolioAsset>
                {
                    new() { Symbol = "VTI", Quantity = 100, CurrentPrice = Money.Usd(250), AverageCost = Money.Usd(200) }
                },
                Expenses = new List<PlannedExpense>(),
                BirthYear = 1985,
                EarlyRetirementYear = 2020,
                FullRetirementAge = 65,
                MonthlyContribution = Money.Usd(2500),
            };

            var filePath = Path.Combine(_testDirectory, TestFileName);

            try
            {
                // Act
                var json = JsonSerializer.Serialize(input, _jsonOptions);
                File.WriteAllText(filePath, json);

                var content = File.ReadAllText(filePath);
                var deserialized = JsonSerializer.Deserialize<FirePlanInput>(content, _jsonOptions);

                // Assert
                deserialized.Should().NotBeNull();
                deserialized!.BirthYear.Should().Be(1985);
                deserialized.AccumulationPortfolio.Should().HaveCount(1);
            }
            finally
            {
                if (File.Exists(filePath)) File.Delete(filePath);
            }
        }

        [Fact]
        public void LoadFromFile_MalformedJson_ThrowsException()
        {
            // Arrange
            var filePath = Path.Combine(_testDirectory, TestFileName);
            File.WriteAllText(filePath, "{ invalid json }");

            try
            {
                // Act & Assert
                var action = () =>
                {
                    var content = File.ReadAllText(filePath);
                    JsonSerializer.Deserialize<FirePlanInput>(content, _jsonOptions);
                };

                action.Should().Throw<JsonException>();
            }
            finally
            {
                if (File.Exists(filePath)) File.Delete(filePath);
            }
        }

        [Fact]
        public void LoadFromFile_NonexistentFile_ThrowsFileNotFoundException()
        {
            // Arrange
            var filePath = Path.Combine(_testDirectory, "nonexistent.json");

            // Act & Assert
            var action = () => File.ReadAllText(filePath);
            action.Should().Throw<FileNotFoundException>();
        }

        [Fact]
        public void SaveLoadCycle_ComplexPlan_PreservesAllData()
        {
            // Arrange
            var original = new FirePlanInput
            {
                AccumulationPortfolio = new List<PortfolioAsset>
                {
                    new() { Symbol = "VTI", Quantity = 100, CurrentPrice = Money.Usd(250), AverageCost = Money.Usd(200) },
                    new() { Symbol = "BND", Quantity = 50, CurrentPrice = Money.Usd(80), AverageCost = Money.Usd(75) }
                },
                Expenses = new List<PlannedExpense>
                {
                    new() { Type = "Vacation", NetAmount = Money.Usd(10000), RepetitionCount = 2 },
                    new() { Type = "Health", NetAmount = Money.Usd(5000) }
                },
                BirthYear = 1990,
                EarlyRetirementYear = 2025,
                FullRetirementAge = 65,
                MonthlyContribution = Money.Usd(2000),
            };

            var filePath = Path.Combine(_testDirectory, TestFileName);

            try
            {
                // Act
                var json = JsonSerializer.Serialize(original, _jsonOptions);
                File.WriteAllText(filePath, json);

                var content = File.ReadAllText(filePath);
                var loaded = JsonSerializer.Deserialize<FirePlanInput>(content, _jsonOptions);

                // Assert
                loaded.Should().NotBeNull();
                loaded!.AccumulationPortfolio.Should().HaveCount(2);
                loaded.Expenses.Should().HaveCount(2);
                loaded.BirthYear.Should().Be(1990);
                loaded.AccumulationPortfolio[0].Symbol.Should().Be("VTI");
            }
            finally
            {
                if (File.Exists(filePath)) File.Delete(filePath);
            }
        }

        #endregion

        #region Edge Case Tests

        [Fact]
        public void Serialize_EmptyPortfolio_ProducesValidJson()
        {
            // Arrange
            var input = new FirePlanInput
            {
                AccumulationPortfolio = new List<PortfolioAsset>(),
                Expenses = new List<PlannedExpense>(),
                BirthYear = 1990,
                EarlyRetirementYear = 2025,
                FullRetirementAge = 65,
                MonthlyContribution = Money.Usd(2000),
            };

            // Act
            var json = JsonSerializer.Serialize(input, _jsonOptions);

            // Assert
            json.Should().NotBeNullOrEmpty();
            json.Should().Contain("[]");
        }

        [Fact]
        public void Serialize_LargePortfolio_ProducesValidJson()
        {
            // Arrange
            var assets = Enumerable.Range(0, 50)
                .Select(i => new PortfolioAsset
                {
                    Symbol = $"STOCK{i}",
                    Quantity = 100 + i,
                    CurrentPrice = Money.Usd(250 - i),
                })
                .ToList();

            var input = new FirePlanInput
            {
                AccumulationPortfolio = assets,
                Expenses = new List<PlannedExpense>(),
                BirthYear = 1990,
                EarlyRetirementYear = 2025,
                FullRetirementAge = 65,
                MonthlyContribution = Money.Usd(2000),
            };

            // Act
            var json = JsonSerializer.Serialize(input, _jsonOptions);

            // Assert
            json.Should().NotBeNullOrEmpty();
            var deserialized = JsonSerializer.Deserialize<FirePlanInput>(json, _jsonOptions);
            deserialized!.AccumulationPortfolio.Should().HaveCount(50);
        }

        [Fact]
        public void Serialize_VeryLargeAmounts_PreservesValues()
        {
            // Arrange
            var input = new FirePlanInput
            {
                AccumulationPortfolio = new List<PortfolioAsset>
                {
                    new() { Symbol = "LARGE", Quantity = 1000000, CurrentPrice = Money.Usd(999999999), AverageCost = Money.Usd(500000000) }
                },
                Expenses = new List<PlannedExpense>
                {
                    new() { Type = "Major", NetAmount = Money.Usd(10000000) }
                },
                BirthYear = 1990,
                EarlyRetirementYear = 2025,
                FullRetirementAge = 65,
                MonthlyContribution = Money.Usd(999999),
            };

            // Act
            var json = JsonSerializer.Serialize(input, _jsonOptions);
            var deserialized = JsonSerializer.Deserialize<FirePlanInput>(json, _jsonOptions);

            // Assert
            deserialized!.AccumulationPortfolio[0].Quantity.Should().Be(1000000);
            deserialized.Expenses![0].NetAmount.Amount.Should().Be(10000000);
            deserialized.MonthlyContribution.Amount.Should().Be(999999);
        }

        #endregion
    }
}
