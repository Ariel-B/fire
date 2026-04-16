/**
 * Inflation API Client
 * API calls for Israel CPI historical inflation data
 */

const API_BASE = '/api/Inflation';

export interface InflationDataPoint {
  year: number;
  inflationRate: number;
  indexValue?: number | null;
}

export interface InflationStats {
  periodYears: number;
  averageInflation: number;
  startYear: number;
  endYear: number;
}

export interface InflationHistoryResponse {
  dataPoints: InflationDataPoint[];
  stats: InflationStats[];
  source: string;
  lastUpdated: string;
}

/**
 * Fetch Israel CPI historical data and period CAGR statistics from the backend.
 * Returns null on failure (caller should show error state).
 */
export async function fetchIsraelInflationHistory(): Promise<InflationHistoryResponse | null> {
  try {
    const response = await fetch(`${API_BASE}/israel/historical`);
    if (!response.ok) {
      console.warn(`Failed to fetch Israel inflation data: ${response.status}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching Israel inflation history:', error);
    return null;
  }
}
