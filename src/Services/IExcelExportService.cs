using FirePlanningTool.Models;

namespace FirePlanningTool.Services
{
    /// <summary>
    /// Options for Excel export customization.
    /// </summary>
    public class ExcelExportOptions
    {
        /// <summary>
        /// User-provided scenario name for identification (optional).
        /// </summary>
        public string? ScenarioName { get; set; }

        /// <summary>
        /// User-provided scenario notes (optional).
        /// </summary>
        public string? ScenarioNotes { get; set; }

        /// <summary>
        /// USD/ILS exchange rate at time of export.
        /// </summary>
        public decimal UsdIlsRate { get; set; }

        /// <summary>
        /// User input parameters used in calculation.
        /// </summary>
        public required FirePlanInput Input { get; set; }

        /// <summary>
        /// Application version to include in export.
        /// </summary>
        public string AppVersion { get; set; } = "1.0.0";
    }

    /// <summary>
    /// Service for exporting FIRE calculation results to Excel format.
    /// Generates multi-sheet workbooks with comprehensive simulation data.
    /// </summary>
    public interface IExcelExportService
    {
        /// <summary>
        /// Generates an Excel workbook with FIRE calculation results.
        /// </summary>
        /// <param name="result">Complete calculation results to export.</param>
        /// <param name="options">Export options including scenario info and input parameters.</param>
        /// <returns>Excel file as byte array (.xlsx format).</returns>
        byte[] GenerateExcel(FireCalculationResult result, ExcelExportOptions options);
    }
}
