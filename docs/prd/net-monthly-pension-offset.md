# Net Monthly Pension Offset Feature

## Product Requirements Document (PRD)

**Version:** 1.0  
**Date:** 2026-01-10  
**Status:** Implemented

---

## Summary

This feature allows users to define a **fixed (non-indexed) net monthly pension** that reduces stock-portfolio withdrawals during the retirement phase. The pension offset starts when the user reaches their **full retirement age** and is applied **month-by-month** for accurate timing.

## Business Objectives

1. **Realistic Retirement Modeling**: Allow users to incorporate guaranteed income sources (pension, social security) into their FIRE planning
2. **Reduced Withdrawal Requirements**: Accurately model how pension income reduces the need to draw down investment portfolios
3. **Multi-Currency Support**: Support pensions denominated in different currencies (USD/ILS)

## User Stories

### Story 1: Define Pension Amount
**As a** FIRE planner  
**I want to** enter my expected monthly pension amount and its currency  
**So that** my retirement projections account for this guaranteed income

**Acceptance Criteria:**
- User can input pension amount (net, after tax)
- User can select pension currency ($ or ₪)
- Pension is clearly labeled as "fixed nominal" (not inflation-indexed)
- Amount is validated (>= 0, reasonable maximum)

### Story 2: Precise Pension Start Date
**As a** FIRE planner  
**I want to** specify my exact birth date  
**So that** my pension starts in the correct month when I reach full retirement age

**Acceptance Criteria:**
- Date picker replaces simple year input
- Pension starts the month **after** the user reaches full retirement age
- Example: Born June 15, 1960 + FRA 67 → pension starts July 2027

### Story 3: Withdrawal Offset Calculation
**As a** FIRE planner  
**I want** my pension to reduce my required portfolio withdrawals  
**So that** my portfolio lasts longer

**Acceptance Criteria:**
- Pension reduces gross withdrawal from portfolio
- Withdrawals cannot go negative (floor at zero)
- Currency conversion applied correctly for pension in different currency than plan

## Functional Requirements

### FR1: Input Fields
| Field | Type | Validation | Description |
|-------|------|------------|-------------|
| BirthDate | Date | Required, valid date, year 1900-2076 | Full birth date for pension timing |
| PensionNetMonthlyAmount | Decimal | >= 0, <= 1,000,000 | Net monthly pension (after tax) |
| PensionCurrency | String | $ or ₪ | Currency of pension amount |

### FR2: Pension Start Calculation
```
pensionStartDate = AddYears(BirthDate, FullRetirementAge)
pensionStartMonth = FirstDayOfNextMonth(pensionStartDate)
```

### FR3: Monthly Withdrawal Offset
For each retirement month where pension is active:
```
requiredPortfolioWithdrawal = max(0, baseWithdrawal - pensionNetMonthlyAmount)
```

### FR4: Currency Conversion
- If pension currency differs from plan currency, convert using USD/ILS rate
- Conversion: `pensionInUsd = pensionAmount / usdIlsRate` (for ILS pension)

## Non-Functional Requirements

### NFR1: Backward Compatibility
- Plans without BirthDate use January 1 of the birth year
- Plans without pension fields default to 0 pension

### NFR2: Performance
- No significant impact on calculation time (< 10ms additional)

### NFR3: Accuracy
- Month-level precision for pension start timing
- All monetary calculations use decimal type for precision

## Technical Design

### Backend Changes
- **src/Models/FirePlanModels.cs**: Add BirthDate, PensionNetMonthlyAmount, PensionCurrency
- **src/Services/RetirementPhaseCalculator.cs**: Implement monthly pension offset logic
- **src/Validators/FirePlanInputValidator.cs**: Validate new fields
- **src/Services/CalculationConstants.cs**: Add pension-related constants

### Frontend Changes
- **wwwroot/index.html**: Date picker for birth date, pension input section
- **wwwroot/ts/types/index.ts**: TypeScript type definitions
- **wwwroot/ts/api/fire-plan-api.ts**: API payload handling
- **wwwroot/ts/app.ts**: UI input handling and save/load

## Test Coverage

### Unit Tests (PensionOffsetTests.cs)
- ✅ Pension starts at correct month after full retirement age
- ✅ No pension offset applied before full retirement age
- ✅ Pension in ILS converted to USD correctly
- ✅ Pension in USD used directly
- ✅ Withdrawal floored at zero when pension exceeds withdrawal
- ✅ Zero pension does not affect calculations
- ✅ Valid pension amounts are processed correctly

### Validation Tests
- ✅ BirthDate required and valid
- ✅ BirthDate year range validation (1900 to current+50)
- ✅ PensionNetMonthlyAmount >= 0
- ✅ PensionNetMonthlyAmount <= 1,000,000
- ✅ PensionCurrency is supported value

## UI/UX Design

### Global Settings Section
```
┌─────────────────────────────────────────┐
│ תאריך לידה (Birth Date)                 │
│ [📅 1990-01-01                      ]   │
│ תאריך לידה מלא לחישוב מדויק של תחילת קצבה │
├─────────────────────────────────────────┤
│ קצבה חודשית (Monthly Pension)           │
│ ─────────────────────────────────────   │
│ סכום קצבה חודשי נטו (קבוע, לא צמוד)     │
│ [₪▼] [____________0_______________]     │
│ קצבה נטו לחודש, מתחילה בגיל פרישה מלאה   │
│ (לא צמודה לאינפלציה)                    │
└─────────────────────────────────────────┘
```

## Out of Scope
- Inflation-indexed pension behavior
- Day-level pension start timing (only month-level)
- Multiple pension sources
- Pension end date/lifetime limits
- Backward compatibility for loading old plans that only contain BirthYear (breaking change per requirements)

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Users don't understand "fixed nominal" | Medium | Clear Hebrew label and tooltip |
| Exchange rate volatility | Low | User can update USD/ILS rate manually |
| Pension amount too optimistic | Medium | Documentation recommends conservative estimates |

## Success Metrics
- Feature usage: % of plans that include pension amount > 0
- Calculation accuracy: Zero calculation errors reported
- User satisfaction: No support tickets about pension timing

---

## Appendix: Implementation Details

### Pension Start Month Algorithm
```csharp
private static DateTime CalculatePensionStartDate(DateTime birthDate, int fullRetirementAge)
{
    // Add full retirement age years to birth date
    var fullRetirementDate = birthDate.AddYears(fullRetirementAge);
    
    // Pension starts the next calendar month
    // If they turn 67 on June 15, 2027, pension starts July 1, 2027
    return new DateTime(
        fullRetirementDate.Year,
        fullRetirementDate.Month,
        1
    ).AddMonths(1);
}
```

### Withdrawal Offset Logic
```csharp
// Apply pension offset if pension is active for this month
if (hasPension && IsPensionActive(currentCalendarYear, currentMonth, pensionStartDate))
{
    // Pension covers part of net spending, reducing required gross withdrawal
    var pensionGrossEquivalent = effectiveTaxRate == 0 
        ? pensionNetMonthlyAmountUsd 
        : pensionNetMonthlyAmountUsd / (1 - effectiveTaxRate);
    monthlyWithdrawal = Math.Max(0, monthlyWithdrawal - pensionGrossEquivalent);
}
```
