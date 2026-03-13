/**
 * API client for export functionality.
 * Handles exporting FIRE calculation results to Excel and CSV formats.
 */

import type { FireCalculationResult, FirePlanInput } from '../types';

/**
 * Options for export functionality.
 */
export interface ExportOptions {
    /** Optional scenario name for identification */
    scenarioName?: string;
    /** Optional scenario notes */
    scenarioNotes?: string;
    /** USD/ILS exchange rate at time of export (optional, uses input rate if not provided) */
    usdIlsRate?: number;
}

/**
 * Request payload for export endpoint.
 * Server calculates fresh results from input to avoid round-trip transformation issues.
 */
interface ExportRequest {
    input: FirePlanInput;
    scenarioName?: string;
    scenarioNotes?: string;
    usdIlsRate?: number;
}

/**
 * Exports FIRE calculation results to Excel format (.xlsx).
 * Server calculates fresh results from input to ensure data integrity.
 * Downloads the file to the user's browser.
 * 
 * @param input FIRE plan input parameters
 * @param options Export options including scenario name/notes
 * @returns Promise that resolves when download starts
 * @throws Error if export fails
 */
export async function exportToExcel(
    input: FirePlanInput,
    options: ExportOptions = {}
): Promise<void> {
    const request: ExportRequest = {
        input,
        scenarioName: options.scenarioName,
        scenarioNotes: options.scenarioNotes,
        usdIlsRate: options.usdIlsRate
    };

    const response = await fetch('/api/Export/excel', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Export failed' }));
        throw new Error(errorData.error || `Export failed with status ${response.status}`);
    }

    // Get filename from Content-Disposition header or generate default
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = 'FIRE_Plan.xlsx';
    if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
            filename = filenameMatch[1].replace(/['"]/g, '');
        }
    }

    // Download the file
    const blob = await response.blob();
    downloadBlob(blob, filename);
}

/**
 * Exports FIRE calculation results to CSV format (fallback for compatibility).
 * Server calculates fresh results from input.
 * Downloads the file to the user's browser.
 * 
 * @param input FIRE plan input parameters
 * @param options Export options including scenario name
 * @returns Promise that resolves when download starts
 * @throws Error if export fails
 */
export async function exportToCsv(
    input: FirePlanInput,
    options: ExportOptions = {}
): Promise<void> {
    const request: ExportRequest = {
        input,
        scenarioName: options.scenarioName,
        scenarioNotes: options.scenarioNotes
    };

    const response = await fetch('/api/Export/csv', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Export failed' }));
        throw new Error(errorData.error || `Export failed with status ${response.status}`);
    }

    // Get filename from Content-Disposition header or generate default
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = 'FIRE_Plan.csv';
    if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
            filename = filenameMatch[1].replace(/['"]/g, '');
        }
    }

    // Download the file
    const blob = await response.blob();
    downloadBlob(blob, filename);
}

/**
 * Helper function to download a blob as a file.
 * Creates a temporary anchor element and clicks it to trigger download.
 * 
 * @param blob File data as Blob
 * @param filename Name for the downloaded file
 */
function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Clean up the object URL after a short delay
    setTimeout(() => URL.revokeObjectURL(url), 100);
}
