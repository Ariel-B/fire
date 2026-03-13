/**
 * RSU Table Component
 * UI component for managing RSU grants - add, edit, remove grants
 */

import { RsuGrant, RsuConfiguration, VestingScheduleType } from '../types/rsu-types.js';
import { getRsuState, getRsuGrants, getRsuConfiguration, addRsuGrant, removeRsuGrant, updateRsuGrant, RsuState, calculateVestedShares, calculateSection102EligibleShares } from '../services/rsu-state.js';
import { RSU_CONSTANTS } from '../types/rsu-types.js';

/** Callback type for state changes */
export type RsuTableChangeHandler = (state: RsuState) => void;

// Table container element
let tableContainer: HTMLElement | null = null;
let onChangeCallback: RsuTableChangeHandler | null = null;

/**
 * Initialize the RSU table component
 * @param containerId - ID of the container element
 * @param onChange - Callback when grants change
 */
export function initRsuTable(containerId: string, onChange?: RsuTableChangeHandler): void {
    tableContainer = document.getElementById(containerId);
    if (!tableContainer) {
        console.warn(`RSU table container '${containerId}' not found`);
        return;
    }
    
    onChangeCallback = onChange || null;
    renderTable();
}

/**
 * Render the RSU grants table
 */
export function renderTable(): void {
    if (!tableContainer) return;
    
    const grants = getRsuGrants();
    
    tableContainer.innerHTML = `
        <div class="rsu-table-wrapper">
            <div class="rsu-table-header">
                <h3 class="text-lg font-semibold text-gray-800">מענקי RSU</h3>
                <div class="flex items-center gap-2">
                    <div class="relative group/copy">
                        <button id="copy-rsu-table-btn" class="plan-btn bg-white hover:bg-blue-50 text-gray-700 p-2 rounded-full shadow-lg transition-all duration-200 hover:scale-105 disabled:opacity-30 disabled:cursor-not-allowed" ${grants.length === 0 ? 'disabled' : ''}>
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </button>
                        <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded whitespace-nowrap opacity-0 group-hover/copy:opacity-100 transition-opacity pointer-events-none">העתק נתונים ללוח</span>
                    </div>
                    <button id="add-rsu-grant-btn" class="btn-primary text-sm px-3 py-1">
                        + הוסף מענק
                    </button>
                </div>
            </div>
            
            ${grants.length === 0 ? renderEmptyState() : renderGrantsTable(grants)}
            
            <div id="rsu-grant-form-container" class="hidden mt-4"></div>
        </div>
    `;
    
    // Attach event listeners
    attachEventListeners();
}

/**
 * Render empty state when no grants exist
 */
function renderEmptyState(): string {
    return `
        <div class="text-center py-8 text-gray-500">
            <svg class="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
            </svg>
            <p>אין מענקי RSU</p>
            <p class="text-sm mt-1">לחץ על "הוסף מענק" כדי להתחיל</p>
        </div>
    `;
}

/**
 * Render the grants table
 */
function renderGrantsTable(grants: RsuGrant[]): string {
    const config = getRsuConfiguration();
    const currentPrice = config.currentPricePerShare || 0;
    const currencySymbol = config.currency === '$' ? '$' : '₪';
    
    // Sort grants by date (oldest first)
    const sortedGrants = [...grants].sort((a, b) => 
        new Date(a.grantDate).getTime() - new Date(b.grantDate).getTime()
    );
    const rows = sortedGrants.map((grant, index) => renderGrantRow(grant, index)).join('');
    
    // Calculate totals
    const now = new Date();
    let totalShares = 0;
    let totalSold = 0;
    let totalVested = 0;
    let totalUnvested = 0;
    let totalValueAtGrant = 0;
    let totalCurrentValue = 0;
    let totalVestedValue = 0;
    let totalSection102Eligible = 0;
    let totalSection102Value = 0;
    // Track 102 and non-102 portions separately for correct tax calculation
    let total102CostBasis = 0;
    let total102Value = 0;
    let totalNon102CostBasis = 0;
    let totalNon102Value = 0;
    
    for (const grant of grants) {
        const sharesSold = grant.sharesSold || 0;
        const remainingShares = grant.numberOfShares - sharesSold;
        
        // Use shared functions
        const vestedShares = calculateVestedShares(grant, now);
        const unvestedShares = grant.numberOfShares - vestedShares;
        const section102Eligible = calculateSection102EligibleShares(grant, now);
        const vestedAvailable = Math.max(0, vestedShares - sharesSold);
        
        // Split vested into 102 and non-102
        const non102VestedShares = Math.max(0, vestedAvailable - section102Eligible);
        
        // Values
        const valueAtGrant = grant.numberOfShares * grant.priceAtGrant;
        const currentValue = remainingShares * currentPrice;
        const vestedValue = vestedAvailable * currentPrice;
        const section102Value = section102Eligible * currentPrice;
        
        // 102 portion
        const grantSection102Value = section102Eligible * currentPrice;
        const grantSection102CostBasis = section102Eligible * grant.priceAtGrant;
        
        // Non-102 portion
        const grantNon102Value = non102VestedShares * currentPrice;
        const grantNon102CostBasis = non102VestedShares * grant.priceAtGrant;
        
        // Accumulate totals
        totalShares += grant.numberOfShares;
        totalSold += sharesSold;
        totalVested += vestedShares;
        totalUnvested += unvestedShares;
        totalValueAtGrant += valueAtGrant;
        totalCurrentValue += currentValue;
        totalVestedValue += vestedValue;
        totalSection102Eligible += section102Eligible;
        totalSection102Value += section102Value;
        total102Value += grantSection102Value;
        total102CostBasis += grantSection102CostBasis;
        totalNon102Value += grantNon102Value;
        totalNon102CostBasis += grantNon102CostBasis;
    }
    
    // Calculate net values for totals
    const marginalTaxRate = config.marginalTaxRate / 100;
    const surtaxRate = config.subjectTo3PercentSurtax ? RSU_CONSTANTS.SURTAX_RATE : 0;
    const section102TaxRate = 0.25;
    
    // 102 portion tax (25%)
    const total102Profit = Math.max(0, total102Value - total102CostBasis);
    const total102Tax = total102Profit * section102TaxRate;
    
    // Non-102 portion tax (marginal rate)
    const totalNon102Profit = Math.max(0, totalNon102Value - totalNon102CostBasis);
    const totalNon102Tax = totalNon102Profit * (marginalTaxRate + surtaxRate);
    
    // Combined vested net
    const totalVestedNetValue = totalVestedValue - total102Tax - totalNon102Tax;
    
    // Section 102 net (same as 102 portion)
    const totalSection102NetValue = totalSection102Value - total102Tax;
    
    const summaryRow = `
        <tfoot class="bg-gray-100 font-semibold">
            <tr>
                <td class="px-3 py-2 text-gray-900">סה״כ</td>
                <td class="px-3 py-2 text-gray-900">${totalShares.toLocaleString()}</td>
                <td class="px-3 py-2 text-gray-900">${totalSold.toLocaleString()}</td>
                <td class="px-3 py-2 text-gray-900">${totalVested.toLocaleString()}</td>
                <td class="px-3 py-2 text-gray-900">${totalShares > 0 ? Math.round(totalVested / totalShares * 100) : 0}%</td>
                <td class="px-3 py-2 text-gray-900">${totalUnvested.toLocaleString()}</td>
                <td class="px-3 py-2 text-gray-500">-</td>
                <td class="px-3 py-2 text-gray-900">${currencySymbol}${totalValueAtGrant.toLocaleString()}</td>
                <td class="px-3 py-2 text-gray-900 font-bold">${currencySymbol}${totalCurrentValue.toLocaleString()}</td>
                <td class="px-3 py-2 text-green-600">${Math.max(0, totalVested - totalSold).toLocaleString()} <span class="text-gray-500">(${currencySymbol}${totalVestedValue.toLocaleString()})</span><br><span class="text-xs text-green-700">נטו: ${currencySymbol}${Math.round(totalVestedNetValue).toLocaleString()}</span></td>
                <td class="px-3 py-2 text-teal-600">${totalSection102Eligible.toLocaleString()} <span class="text-gray-500">(${currencySymbol}${totalSection102Value.toLocaleString()})</span><br><span class="text-xs text-teal-700">נטו: ${currencySymbol}${Math.round(totalSection102NetValue).toLocaleString()}</span></td>
                <td class="px-3 py-2"></td>
            </tr>
        </tfoot>
    `;
    
    return `
        <div class="overflow-x-auto mt-4">
            <table class="min-w-full bg-white border border-gray-200 rounded-lg text-sm">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">תאריך מענק</th>
                        <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">מניות</th>
                        <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">נמכרו</th>
                        <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">הבשילו</th>
                        <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">% הבשלה</th>
                        <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">לא הבשילו</th>
                        <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">הבשלה הבאה</th>
                        <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">שווי במענק</th>
                        <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">שווי נוכחי</th>
                        <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">שווי הבשיל</th>
                        <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">שווי 102</th>
                        <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">פעולות</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                    ${rows}
                </tbody>
                ${summaryRow}
            </table>
        </div>
    `;
}

/**
 * Render a single grant row
 */
function renderGrantRow(grant: RsuGrant, index: number): string {
    const config = getRsuConfiguration();
    const currentPrice = config.currentPricePerShare || 0;
    const grantDate = new Date(grant.grantDate);
    const grantDateStr = grantDate.toLocaleDateString('he-IL');
    const currencySymbol = grant.currency === '$' ? '$' : '₪';
    const sharesSold = grant.sharesSold || 0;
    const remainingShares = grant.numberOfShares - sharesSold;
    const vestingYears = grant.vestingPeriodYears || 4;
    
    // Calculate vested shares using shared function
    const now = new Date();
    const vestedShares = calculateVestedShares(grant, now);
    const unvestedShares = grant.numberOfShares - vestedShares;
    
    // Calculate next vesting date
    const yearsSinceGrant = (now.getTime() - grantDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    let nextVestingDate = '-';
    if (unvestedShares > 0) {
        const yearsVested = Math.floor(yearsSinceGrant);
        const nextVestingYear = yearsVested + 1;
        if (nextVestingYear <= vestingYears) {
            const nextDate = new Date(grantDate);
            nextDate.setFullYear(nextDate.getFullYear() + nextVestingYear);
            nextVestingDate = nextDate.toLocaleDateString('he-IL');
        }
    }
    
    // Calculate Section 102 eligible shares using shared function
    const section102Eligible = calculateSection102EligibleShares(grant, now);
    
    // Calculate values
    const valueAtGrant = grant.numberOfShares * grant.priceAtGrant;
    const currentValue = remainingShares * currentPrice;
    const vestedValue = Math.max(0, vestedShares - sharesSold) * currentPrice;
    const section102Value = section102Eligible * currentPrice;
    
    // Vested available (can sell now)
    const vestedAvailable = Math.max(0, vestedShares - sharesSold);
    
    // Calculate net values after taxes
    // Section 102 eligible shares get 25% tax, non-102 vested get marginal rate
    const marginalTaxRate = config.marginalTaxRate / 100;
    const section102TaxRate = 0.25; // 25% capital gains tax
    
    // Split vested shares into 102-eligible and non-102
    // section102Eligible is already capped at vestedAvailable in calculateSection102EligibleShares
    const non102VestedShares = Math.max(0, vestedAvailable - section102Eligible);
    
    // Vested net: split between 102 (25%) and non-102 (marginal rate)
    // 102 portion
    const vested102Value = section102Eligible * currentPrice;
    const vested102CostBasis = section102Eligible * grant.priceAtGrant;
    const vested102Profit = Math.max(0, vested102Value - vested102CostBasis);
    const vested102Tax = vested102Profit * section102TaxRate;
    
    // Non-102 portion (marginal tax rate)
    const vestedNon102Value = non102VestedShares * currentPrice;
    const vestedNon102CostBasis = non102VestedShares * grant.priceAtGrant;
    const vestedNon102Profit = Math.max(0, vestedNon102Value - vestedNon102CostBasis);
    const vestedNon102Tax = vestedNon102Profit * marginalTaxRate;
    
    // Total vested net
    const vestedNetValue = vestedValue - vested102Tax - vestedNon102Tax;
    
    // Section 102 net: 25% tax on profit (same as vested102 calculation)
    const section102NetValue = section102Value - vested102Tax;
    
    return `
        <tr class="hover:bg-gray-50" data-grant-id="${grant.id}" data-testid="rsu-grant-row">
            <td class="px-3 py-2 whitespace-nowrap text-gray-900">${grantDateStr}</td>
            <td class="px-3 py-2 whitespace-nowrap text-gray-900">${grant.numberOfShares.toLocaleString()}</td>
            <td class="px-3 py-2 whitespace-nowrap text-gray-900">${sharesSold.toLocaleString()}</td>
            <td class="px-3 py-2 whitespace-nowrap text-gray-900">${vestedShares.toLocaleString()}</td>
            <td class="px-3 py-2 whitespace-nowrap text-gray-900">${Math.round(vestedShares / grant.numberOfShares * 100)}%</td>
            <td class="px-3 py-2 whitespace-nowrap text-gray-900">${unvestedShares.toLocaleString()}</td>
            <td class="px-3 py-2 whitespace-nowrap text-gray-900">${nextVestingDate}</td>
            <td class="px-3 py-2 whitespace-nowrap text-gray-900">${currencySymbol}${valueAtGrant.toLocaleString()}</td>
            <td class="px-3 py-2 whitespace-nowrap text-gray-900 font-medium">${currencySymbol}${currentValue.toLocaleString()}</td>
            <td class="px-3 py-2 whitespace-nowrap text-green-600">${vestedAvailable.toLocaleString()} <span class="text-gray-400">(${currencySymbol}${vestedValue.toLocaleString()})</span><br><span class="text-xs text-green-700">נטו: ${currencySymbol}${Math.round(vestedNetValue).toLocaleString()}</span></td>
            <td class="px-3 py-2 whitespace-nowrap text-teal-600">${section102Eligible.toLocaleString()} <span class="text-gray-400">(${currencySymbol}${section102Value.toLocaleString()})</span><br><span class="text-xs text-teal-700">נטו: ${currencySymbol}${Math.round(section102NetValue).toLocaleString()}</span></td>
            <td class="px-3 py-2 whitespace-nowrap">
                <button class="edit-grant-btn text-blue-600 hover:text-blue-800 ml-2" data-grant-id="${grant.id}" data-testid="rsu-edit-grant">
                    ערוך
                </button>
                <button class="delete-grant-btn text-red-600 hover:text-red-800" data-grant-id="${grant.id}" data-testid="rsu-delete-grant">
                    מחק
                </button>
            </td>
        </tr>
    `;
}

/**
 * Attach event listeners to table elements
 */
function attachEventListeners(): void {
    // Add grant button
    const addBtn = document.getElementById('add-rsu-grant-btn');
    addBtn?.addEventListener('click', () => showGrantForm(null));
    
    // Copy table button
    const copyBtn = document.getElementById('copy-rsu-table-btn');
    copyBtn?.addEventListener('click', () => copyTableToClipboard(copyBtn as HTMLElement));
    
    // Edit buttons
    document.querySelectorAll('.edit-grant-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const grantId = parseInt((e.target as HTMLElement).getAttribute('data-grant-id') || '0');
            const grants = getRsuGrants();
            const grant = grants.find((g: RsuGrant) => g.id === grantId);
            if (grant) {
                showGrantForm(grant);
            }
        });
    });
    
    // Delete buttons
    document.querySelectorAll('.delete-grant-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const grantId = parseInt((e.target as HTMLElement).getAttribute('data-grant-id') || '0');
            if (confirm('האם אתה בטוח שברצונך למחוק את המענק?')) {
                removeRsuGrant(grantId);
                renderTable();
                notifyChange();
            }
        });
    });
}

/**
 * Show the grant form (for adding or editing)
 */
function showGrantForm(existingGrant: RsuGrant | null): void {
    const formContainer = document.getElementById('rsu-grant-form-container');
    if (!formContainer) return;
    
    const isEdit = existingGrant !== null;
    const today = new Date().toISOString().split('T')[0];
    
    formContainer.innerHTML = `
        <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h4 class="text-md font-semibold mb-3">${isEdit ? 'עריכת מענק' : 'הוספת מענק חדש'}</h4>
            <form id="rsu-grant-form" class="grid grid-cols-2 gap-4">
                <input type="hidden" id="grant-id" value="${existingGrant?.id || '0'}">
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">תאריך מענק</label>
                    <input type="date" id="grant-date" 
                           value="${existingGrant ? new Date(existingGrant.grantDate).toISOString().split('T')[0] : today}"
                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">מספר מניות</label>
                    <input type="number" id="grant-shares" min="1"
                           value="${existingGrant?.numberOfShares || ''}"
                           placeholder="1000"
                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">מניות שנמכרו</label>
                    <input type="number" id="grant-shares-sold" min="0"
                           value="${existingGrant?.sharesSold || 0}"
                           placeholder="0"
                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                    <p class="text-xs text-gray-500 mt-1">מניות שכבר נמכרו מהמענק הזה</p>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">מחיר מניה במענק</label>
                    <input type="number" id="grant-price" step="0.01" min="0.01"
                           value="${existingGrant?.priceAtGrant || ''}"
                           placeholder="100.00"
                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">מטבע</label>
                    <select id="grant-currency"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                        <option value="$" ${existingGrant?.currency === '$' ? 'selected' : ''}>$ דולר</option>
                        <option value="₪" ${existingGrant?.currency === '₪' ? 'selected' : ''}>₪ שקל</option>
                    </select>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">תקופת הבשלה (שנים)</label>
                    <input type="number" id="grant-vesting-years" min="1" max="10"
                           value="${existingGrant?.vestingPeriodYears || 4}"
                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">סוג הבשלה</label>
                    <select id="grant-vesting-type"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                        <option value="Standard" selected>סטנדרטי (25% לשנה)</option>
                    </select>
                </div>
                
                <div class="col-span-2 flex justify-end gap-2 mt-2">
                    <button type="button" id="cancel-grant-btn" class="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100">
                        ביטול
                    </button>
                    <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                        ${isEdit ? 'עדכן' : 'הוסף'}
                    </button>
                </div>
            </form>
        </div>
    `;
    
    formContainer.classList.remove('hidden');
    
    // Attach form event listeners
    const form = document.getElementById('rsu-grant-form');
    form?.addEventListener('submit', handleFormSubmit);
    
    const cancelBtn = document.getElementById('cancel-grant-btn');
    cancelBtn?.addEventListener('click', () => {
        formContainer.classList.add('hidden');
        formContainer.innerHTML = '';
    });
}

/**
 * Handle form submission
 */
function handleFormSubmit(e: Event): void {
    e.preventDefault();
    
    const grantId = parseInt((document.getElementById('grant-id') as HTMLInputElement)?.value || '0');
    const grantDate = (document.getElementById('grant-date') as HTMLInputElement)?.value;
    const shares = parseInt((document.getElementById('grant-shares') as HTMLInputElement)?.value || '0');
    const sharesSold = parseInt((document.getElementById('grant-shares-sold') as HTMLInputElement)?.value || '0');
    const price = parseFloat((document.getElementById('grant-price') as HTMLInputElement)?.value || '0');
    const currency = (document.getElementById('grant-currency') as HTMLSelectElement)?.value;
    const vestingYears = parseInt((document.getElementById('grant-vesting-years') as HTMLInputElement)?.value || '4');
    const vestingType = (document.getElementById('grant-vesting-type') as HTMLSelectElement)?.value as VestingScheduleType;
    
    // Validation
    if (!grantDate || shares <= 0 || price <= 0) {
        alert('נא למלא את כל השדות בצורה תקינה');
        return;
    }
    
    // Validate shares sold doesn't exceed total shares
    if (sharesSold > shares) {
        alert('מספר המניות שנמכרו לא יכול לעלות על סך המניות במענק');
        return;
    }
    
    const grant: RsuGrant = {
        id: grantId || Date.now(), // Use timestamp as ID for new grants
        grantDate: new Date(grantDate).toISOString(),
        numberOfShares: shares,
        sharesSold: sharesSold,
        priceAtGrant: price,
        currency: currency as '$' | '₪',
        vestingPeriodYears: vestingYears,
        vestingType: vestingType
    };
    
    if (grantId > 0) {
        // Update existing grant - updateRsuGrant expects (id, updates)
        updateRsuGrant(grantId, grant);
    } else {
        // Add new grant
        addRsuGrant(grant);
    }
    
    // Hide form and re-render table
    const formContainer = document.getElementById('rsu-grant-form-container');
    formContainer?.classList.add('hidden');
    renderTable();
    notifyChange();
}

/**
 * Notify change callback
 */
function notifyChange(): void {
    if (onChangeCallback) {
        onChangeCallback(getRsuState());
    }
}

/**
 * Get the current grants from the table
 */
export function getTableGrants(): RsuGrant[] {
    return getRsuGrants();
}

/**
 * Set grants in the table (e.g., when loading from saved plan)
 */
export function setTableGrants(grants: RsuGrant[]): void {
    // Clear existing grants
    const existingGrants = getRsuGrants();
    existingGrants.forEach((g: RsuGrant) => removeRsuGrant(g.id));
    // Add new grants
    grants.forEach((g: RsuGrant) => addRsuGrant(g));
    renderTable();
}

/**
 * Copy RSU grants table data to clipboard as tab-separated text
 */
async function copyTableToClipboard(button: HTMLElement): Promise<void> {
    const grants = getRsuGrants();
    if (grants.length === 0) return;
    
    const config = getRsuConfiguration();
    const currentPrice = config.currentPricePerShare || 0;
    const currencySymbol = config.currency === '$' ? '$' : '₪';
    const now = new Date();
    
    // Sort grants by date (oldest first)
    const sortedGrants = [...grants].sort((a, b) => 
        new Date(a.grantDate).getTime() - new Date(b.grantDate).getTime()
    );
    
    // Build header row - match all columns in the table (except Actions)
    const headers = [
        'תאריך מענק',
        'מניות',
        'נמכרו',
        'הבשילו',
        '% הבשלה',
        'לא הבשילו',
        'הבשלה הבאה',
        'שווי במענק',
        'שווי נוכחי',
        'שווי הבשיל',
        'שווי 102'
    ];
    
    // Build data rows
    const rows: string[] = [headers.join('\t')];
    
    for (const grant of sortedGrants) {
        const grantDate = new Date(grant.grantDate);
        const sharesSold = grant.sharesSold || 0;
        const remainingShares = grant.numberOfShares - sharesSold;
        const vestingYears = grant.vestingPeriodYears || 4;
        
        // Calculate vested shares
        const vestedShares = calculateVestedShares(grant, now);
        const unvestedShares = grant.numberOfShares - vestedShares;
        const vestedAvailable = Math.max(0, vestedShares - sharesSold);
        
        // Calculate vesting percentage
        const vestingPercent = grant.numberOfShares > 0 ? Math.round(vestedShares / grant.numberOfShares * 100) : 0;
        
        // Calculate next vesting date
        const yearsSinceGrant = (now.getTime() - grantDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        let nextVestingDate = '-';
        if (unvestedShares > 0) {
            const yearsVested = Math.floor(yearsSinceGrant);
            const nextVestingYear = yearsVested + 1;
            if (nextVestingYear <= vestingYears) {
                const nextDate = new Date(grantDate);
                nextDate.setFullYear(nextDate.getFullYear() + nextVestingYear);
                nextVestingDate = nextDate.toLocaleDateString('he-IL');
            }
        }
        
        // Calculate section 102 eligible
        const section102Shares = calculateSection102EligibleShares(grant, now);
        const section102Available = Math.min(section102Shares, vestedAvailable);
        
        // Calculate values
        const valueAtGrant = grant.numberOfShares * grant.priceAtGrant;
        const currentValue = remainingShares * currentPrice;
        const vestedValue = vestedAvailable * currentPrice;
        const section102Value = section102Available * currentPrice;
        
        const row = [
            grantDate.toLocaleDateString('he-IL'),
            grant.numberOfShares.toLocaleString(),
            sharesSold.toLocaleString(),
            vestedShares.toLocaleString(),
            `${vestingPercent}%`,
            unvestedShares.toLocaleString(),
            nextVestingDate,
            `${currencySymbol}${valueAtGrant.toLocaleString()}`,
            `${currencySymbol}${currentValue.toLocaleString()}`,
            `${vestedAvailable.toLocaleString()} (${currencySymbol}${vestedValue.toLocaleString()})`,
            `${section102Available.toLocaleString()} (${currencySymbol}${section102Value.toLocaleString()})`
        ];
        rows.push(row.join('\t'));
    }
    
    const text = rows.join('\n');
    
    try {
        await navigator.clipboard.writeText(text);
        showCopyFeedback(button, true);
    } catch (error) {
        console.error('Failed to copy table data:', error);
        showCopyFeedback(button, false);
    }
}

/**
 * Show visual feedback after copy attempt
 */
function showCopyFeedback(button: HTMLElement, success: boolean): void {
    const originalContent = button.innerHTML;
    const originalClass = button.className;
    
    if (success) {
        button.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
        `;
        button.className = button.className.replace('text-gray-500', 'text-green-600');
    } else {
        button.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
        `;
        button.className = button.className.replace('text-gray-500', 'text-red-600');
    }
    
    // Restore original after 2 seconds
    setTimeout(() => {
        button.innerHTML = originalContent;
        button.className = originalClass;
    }, 2000);
}

/**
 * Destroy the table component
 */
export function destroyRsuTable(): void {
    if (tableContainer) {
        tableContainer.innerHTML = '';
        tableContainer = null;
    }
    onChangeCallback = null;
}
