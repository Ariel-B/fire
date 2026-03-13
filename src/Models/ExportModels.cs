namespace FirePlanningTool.Models
{
    /// <summary>
    /// Request model for Excel/CSV export endpoints.
    /// Server calculates fresh results from input to ensure data integrity.
    /// </summary>
    public class ExportRequest
    {
        /// <summary>
        /// FIRE plan input parameters. Server will calculate results from this.
        /// </summary>
        public FirePlanInput? Input { get; set; }

        /// <summary>
        /// Optional scenario name for identification.
        /// </summary>
        public string? ScenarioName { get; set; }

        /// <summary>
        /// Optional scenario notes.
        /// </summary>
        public string? ScenarioNotes { get; set; }

        /// <summary>
        /// USD/ILS exchange rate at time of export (defaults to input rate).
        /// </summary>
        public decimal? UsdIlsRate { get; set; }
    }
}
