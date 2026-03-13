# Product Requirements Document: RSU Support for Israeli Residents

**Version:** 2.0  
**Last Updated:** December 3, 2025  
**Owner:** Product Team  
**Status:** Revised - Incorporating PM Review Feedback

---

## 1. Executive Summary

### 1.1 Overview
This PRD outlines the requirements for adding Restricted Stock Unit (RSU) grant management to the FIRE Planning Tool. The feature will enable Israeli residents to model RSU compensation alongside their regular investment portfolio, accounting for Israeli tax laws (specifically Section 102 capital gains tax benefits) and vesting schedules.

**Market Timing Rationale:**
- Israeli tech industry boom: Record number of employees with RSU compensation
- FIRE movement growth: Increasing interest in early retirement planning among tech workers
- Tax complexity: Section 102 rules not well understood, leading to suboptimal decisions
- Gap in market: No existing tools combine RSU planning with Section 102 optimization
- User demand: Multiple requests from community for RSU support feature

### 1.2 Goals
- Enable users to track multiple RSU grants with vesting schedules
- Model different RSU liquidation strategies optimized for Israeli tax law (Section 102)
- Visualize RSU value over time and impact on FIRE timeline
- Integrate RSU income with existing portfolio calculations

### 1.3 Success Metrics
- 80%+ test coverage for RSU-related code
- Users can model at least 5 concurrent RSU grants
- Accurate tax calculations compliant with Israeli Section 102 regulations
- Seamless integration with existing FIRE calculations
- **Every calculated number has explanatory tooltip or help text** - zero ambiguity

---

## 2. Background & Context

### 2.1 Problem Statement
Israeli tech workers receiving RSU compensation need to:
1. Model how RSUs contribute to their FIRE goal
2. Understand tax implications under Israeli law (Section 102)
3. Choose optimal liquidation strategies to minimize tax burden
4. See how vested/unvested RSUs affect their retirement timeline
5. **Account for RSU forfeiture**: Upon resignation/early retirement, all unvested RSUs are forfeited - only vested shares remain

### 2.2 Israeli Tax Context - Section 102

**Authoritative Sources:**
- IBI Capital: [מונחים בתוכנית אופציות](https://www.ibi.co.il/hitechoptions/employee-stock-option/)
- IBI Capital: [אופציות או מניות חסומות RSU](https://www.ibi.co.il/hitechoptions/work-remunaration-plan-blocked-options-or-stocks/)

#### 2.2.1 Key Terminology (מילון מונחים)
| Hebrew | English | Definition |
|--------|---------|------------|
| מניה | Share | Security representing ownership in a company |
| ניצע | Beneficiary | Anyone eligible to receive options/shares (employees, directors, consultants) |
| מועד הקצאה | Grant Date | Date when the board approved the RSU award |
| מועדי הבשלה | Vesting Schedule | Dates when shares become exercisable/owned |
| תקופת חסימה | Holding Period | 24-month Section 102 requirement |
| מימוש | Exercise | Converting option to share (for options only) |
| נאמן | Trustee | Entity approved by tax authority to hold shares (e.g., IBI Capital) |

#### 2.2.2 RSU vs Options Comparison
| Aspect | Options (אופציות) | RSU (מניות חסומות) |
|--------|-------------------|---------------------|
| Exercise Price | Yes - must pay to convert | **No** - shares issued for free |
| Conversion | Manual by employee request | **Automatic** at each vesting date |
| Expiration | Yes (typically 7-10 years) | **No** - once vested, yours forever |
| Value if stock drops | Can become worthless ("out of the money") | **Always has value** |
| Forfeiture on leaving | Unvested options forfeited | Unvested RSUs forfeited |

**Key RSU Insight from IBI:**
> "ב-RSU אין תוספת מימוש – המניה מונפקת ללא תשלום... מכשיר ה-RSU הופך למניה באופן אוטומטי במועד ההבשלה, ללא כל צורך בפעולה אקטיבית מצד העובדת."

#### 2.2.3 Section 102 RSU Taxation

**Holding Period (תקופת חסימה)**: 24 months (2 years) **from the GRANT DATE (מועד ההקצאה)**, NOT from vesting date
  - Quote: "הטבת המס ניתנת רק אם המימוש מתבצע לאחר 24 חודשים לפחות ממועד ההקצאה"
  - The 24-month clock starts when the RSU is granted, regardless of when it vests

**With Section 102 Benefit (sale 2+ years after grant date):**
- Capital gains taxed at **25%** (plus 3% surtax if applicable)
- For public companies: Part up to 30-day average price before grant = marginal income tax; appreciation above that = 25% capital gains
- Quote: "רק עליית הערך מהמחיר הממוצע של 30 יום תסווג כרווח הון, עליו תשלמו מס רווח הון בשיעור של 25%"

**Without Section 102 Benefit (sale <2 years after grant date):**
- **ALL profit taxed as income** at marginal rate (up to ~50%)
- Quote: "למי שלא המתין שנתיים מיום ההענקה ועד למכירה – כל הרווח ממכירת מניות אלו יסווג כהכנסת עבודה"

**3% Surtax (מס יסף):**
- Additional 3% tax applies if total annual income exceeds ₪721,560 (2024 threshold)
- Total effective rate with surtax: 25% + 3% = **28%** for high earners

**Key Implication for Vesting:**
- Shares vesting in Year 1: Must wait until Year 2 from grant to get 102 benefit
- Shares vesting in Year 2+: Can sell immediately with 102 benefit (already past holding period)

#### 2.2.4 Optimal Selling Strategy (Section 102)

**Critical Insight:** The 24-month holding period applies to **ALL shares from a grant** based on the **GRANT DATE**, not the vesting date.

This means:
- **Vesting** happens per tranche (typically 25% per year over 4 years)
- **102 eligibility** applies to **ALL vested shares** once 24 months pass from GRANT DATE

**Example Timeline for a Nov 2025 Grant (145 shares, 4-year vest):**

| End of Year | Years Since Grant | Vested Shares | 102-Eligible | Can Sell with 102 Benefit |
|-------------|-------------------|---------------|--------------|---------------------------|
| 2025        | 0                 | 0 (0%)        | No           | 0                         |
| 2026        | 1                 | 36 (25%)      | No (only 1 yr) | 0                       |
| 2027        | 2                 | 72 (50%)      | **Yes** (2 yrs!) | **72** (all vested)   |
| 2028        | 3                 | 109 (75%)     | Yes          | 109 (cumulative)          |
| 2029        | 4                 | 145 (100%)    | Yes          | 145 (all)                 |

**Key Point:** At year 2 from grant, you can sell **ALL 50%** of vested shares with 102 benefit - not just 25%!

**Optimal Strategy ("SellAfter2Years"):**
1. **Years 0-1:** Hold all shares (waiting for 102 eligibility)
2. **Year 2:** Sell all vested shares (50%) - all are now 102-eligible
3. **Year 3+:** Sell each new tranche as it vests (already 102-eligible)

This strategy minimizes tax burden by ensuring all sales qualify for the 25% capital gains rate instead of the ~50% marginal income tax rate.

#### Currency Handling for Tax Calculations
**Key Principle:** All Israeli tax thresholds are in ILS (₪), but stock prices may be in USD ($)

**Conversion Logic:**
1. **Stock prices:** Can be entered in USD or ILS (user choice)
2. **Tax calculations:** Always performed in ILS
  - If price is in USD: Convert using `UsdIlsRate` from plan settings
   - Formula: `priceILS = priceUSD × UsdIlsRate`
3. **3% surtax threshold:** Always ₪721,560 (2024 value, updated annually)
4. **Display:** Show both currencies with conversion rate
   - Example: "Sale Price: $150 (₪540 @ rate 3.6)"

**Example:**
```
User Configuration:
- Stock price: $150 (USD)
- USD/ILS rate: 3.6 (from plan settings)
- Annual income: $250,000 = ₪900,000 (exceeds ₪721,560)
- Subject to 3% surtax: ✓ Yes

Tax Calculation:
1. Convert to ILS: $150 × 3.6 = ₪540 per share
2. Calculate taxes in ILS
3. Apply 3% surtax because ₪900,000 > ₪721,560
4. Convert result back to USD for display (if needed)
```

**Implementation Note:**
- Store all calculations internally in ILS
- Convert to user's preferred currency for display only
- Tooltip shows both currencies: "Net Proceeds: $19,190 (₪69,084)"

**RSU Forfeiture Upon Resignation:**
- **Unvested RSUs**: Forfeited immediately upon termination of employment
- **Vested RSUs**: Remain yours after leaving the company
- **Early retirement impact**: Only shares that have already vested by retirement date can be sold
- **Planning consideration**: Early retirement timing significantly impacts total RSU value realized

### 2.3 User Personas
- **Primary**: Israeli tech workers (ages 25-45) with RSU compensation
- **Secondary**: High-income professionals planning early retirement
- **Technical level**: Intermediate (understand basic stock/tax concepts)

### 2.4 Competitive Landscape

#### 2.4.1 Existing Solutions
**US-Focused Tools:**
1. **Wealthfront RSU Planning:**
   - ✅ Excellent UI, automatic import from brokerages
   - ❌ US tax code only (not applicable to Israeli residents)
   - ❌ No Section 102 support
   
2. **Personal Capital Stock Options Tracker:**
   - ✅ Comprehensive tracking, net worth integration
   - ❌ US-centric, no Israeli tax calculations
   - ❌ Requires account creation (privacy concern)

3. **E*TRADE / Schwab RSU Calculators:**
   - ✅ Provided by brokerages, trusted source
   - ❌ Generic projections only, no tax optimization
   - ❌ No early retirement planning integration

**Israeli Market:**
- **Finding:** No dedicated RSU planning tools with Section 102 support found
- **Alternative:** Spreadsheet templates (manual, error-prone)
- **Gap:** Israeli tech workers use US tools with manual tax adjustments

#### 2.4.2 Our Differentiation
**Unique Value Propositions:**
1. ✨ **Only tool with Section 102 tax optimization**
   - Calculates 2-year holding benefit automatically
   - Compares strategies with forfeiture risks
   
2. ✨ **Integrated FIRE planning**
   - Not standalone RSU tracker
   - Shows impact on retirement timeline
   - Holistic financial picture

3. ✨ **Privacy Focused**
   - Privacy-first (no account required)

4. ✨ **Hebrew Interface**
   - Native language for Israeli users
   - RTL layout, local conventions
   - ILS currency support

5. ✨ **Forfeiture Awareness**
   - Warns about unvested share loss
   - Suggests optimal retirement timing
   - Unique feature not found elsewhere

#### 2.4.3 Competitive Risks
**Threats:**
1. **Financial Advisor Resistance:**
   - DIY tool might threaten advisor business
   - Mitigation: Position as "conversation starter" with advisor
   
2. **Regulatory Scrutiny:**
   - Providing tax advice without license?
   - Mitigation: Strong disclaimers, "educational only" framing
   
3. **Enterprise Tools:**
   - Large companies might build internal tools
   - Mitigation: Focus on individuals, faster iteration

4. **Trust & Accuracy:**
   - Users skeptical of free tools
   - Mitigation: Accountnewvalidations, user testimonials

#### 2.4.4 Market Opportunity
**Target Market Size:**
- Israeli tech workers with RSUs: ~50,000 (estimate)
- Growing rapidly with global tech expansion
- High-value users (avg. RSU grant >$100k)

**Adoption Strategy:**
1. **Early adopters:** Active FIRE community members
2. **Word of mouth:** Share in tech worker WhatsApp groups
3. **SEO:** Rank for "Section 102 calculator" searches
4. **Partnerships:** Israeli financial blogs, tax advisors

**Success Indicator:** 1,000 active users within 6 months

---

## 3. Feature Requirements

### 3.1 RSU Grant Management Tab

#### 3.1.1 Tab Structure
**Location:** New tab next to "תיק השקעות צבירה" (Accumulation Portfolio)

**Tab Name:** "מענקי RSU" (RSU Grants)

**Layout:**

| **RSU Tab Layout** |
|--------------------|
| **Navigation Tabs** |
| `[תיק צבירה]` `[מענקי RSU]` `[תיק פרישה]` `[הוצאות מתוכננות]` |

| **📊 סיכום מענקי RSU** |
|------------------------|
| • סה"כ מניות שהוקצו: **4,000** |
| • מניות שנרכשו: **1,500** |
| • מניות ממתינות: **2,500** |
| • שווי נוכחי: **$450,000** |

| **הגדרות תוכנית** | |
|-------------------|---|
| סימול מניה | `[____]` (GOOGL/MSFT/etc) |
| מחיר נוכחי למניה | `[$___]` (אוטומטי/ידני) |
| מטבע | `(•) דולר  ( ) שקל` |
| תשואה שנתית צפויה | `[__]%` (CAGR/קבוע) |
| תקופת ווסטינג ברירת מחדל | `[4]` שנים |
| אסטרטגיית מכירה | `[▼]` מכירה שנתיים לאחר הענקה (102 מלא) <br> מכירה בעת פרישה (102 חלקי) |

| **הגדרות מס RSU** | |
|-------------------|---|
| מס שולי | `[47]%` (מס הכנסה אישי) |
| מס רווחי הון | `[25]%` (מהגדרות תוכנית) |
| מס יסף 3% | `[✓]` חייב במס יסף 3% (הכנסה > ₪721,560) |

| **📋 מענקי RSU** | | | | | `[+ הוסף מענק]` |
|-----------------|------|---------------|------|---------------|--------|
| **מס'** | **תאריך הענקה** | **כמות** | **מחיר בהענקה** | **וסטינג** | **פעולות** |
| 1 | 01/2023 | 1000 | $150 | 4 ש' | ✏️ 🗑️ |
| 2 | 01/2024 | 800 | $180 | 4 ש' | ✏️ 🗑️ |

#### 3.1.2 Input Fields

**RSU Settings (per company/stock symbol):**
| Field | Type | Default | Validation | Description | Tooltip/Help Text |
|-------|------|---------|------------|-------------|-------------------|
| Stock Symbol | Text | "" | Required, 1-5 chars uppercase | Company ticker (e.g., GOOGL) | "סימול המסחר של החברה בבורסה (לדוגמה: GOOGL, MSFT, AAPL)" |
| Current Price Per Share | Decimal | 0 | > 0 | Auto-fetched via Finnhub API or manual entry | "מחיר נוכחי למניה. לחץ 'רענן' לקבלת מחיר אוטומטי או הזן ידנית" |
| Currency | Radio | "$" | "$" or "₪" | Price currency | "מטבע המחיר של המניה. שים לב: מסים מחושבים בשקלים לפי שער החליפין מהגדרות התוכנית" |
| Expected Annual Return | Decimal | 0 | -100 to 100 | Expected stock growth rate (%, similar to portfolio assets) | "תשואה שנתית צפויה (%). שימו לב: זוהי הערכה בלבד ואינה מבטיחה רווחים" |
| Return Calculation Method | Dropdown | "CAGR" | "CAGR", "Fixed" | How to project future prices | "שיטת חישוב: CAGR = ריבית דריבית, קבוע = אחוז זהה מדי שנה" |
| Default Vesting Period | Number | 4 | 1-10 years | Default years for new grants | "מספר שנים עד שכל המניות יהיו שלך (ברירת מחדל למענקים חדשים)" |
| Liquidation Strategy | Dropdown | Strategy 1 | See 3.2 | How/when to sell vested RSUs | "אסטרטגיית מכירה: מתי למכור את המניות כדי למטב מס. לחץ על ⓘ לפרטים" |

**RSU-Specific Tax Settings:**
| Field | Type | Default | Validation | Description | Tooltip/Help Text |
|-------|------|---------|------------|-------------|-------------------|
| Marginal Tax Rate | Decimal | 47 | 0-100 | User's marginal income tax rate (%) for RSU grant value | "מדרגת המס השולית שלך (%). משמש לחישוב המס על שווי ההענקה. בדרך כלל 31%-50% לפי הכנסה" |
| Subject to 3% Surtax | Checkbox | Checked | Boolean | Whether annual income exceeds ₪721,560 (3% additional tax on gains) | "סמן אם ההכנסה השנתית שלך מעל ₪721,560 (נכון ל-2024). כרוך במס יסף של 3% על רווחי הון" |
| Capital Gains Tax Rate | Decimal | *From Plan Settings* | N/A | Inherited from main plan settings (typically 25%) | "מס רווחי הון (%) מהגדרות תוכנית. בד״כ 25%. לא ניתן לשינוי כאן - ערוך בהגדרות תוכנית" |

**Per-Grant Fields:**
| Field | Type | Default | Input/Calculated | Description | Tooltip/Help Text |
|-------|------|---------|------------------|-------------|-------------------|
| Grant ID | Number | Auto | Calculated | Sequential ID | "מספר זיהוי אוטומטי למענק" |
| Grant Date | Date | Current | User Input | When RSUs were granted | "תאריך בו קיבלת את המענק מהחברה (לא תאריך הווסטינג הראשון)" |
| Number of Shares | Number | 0 | User Input | Total shares granted | "סה״כ מניות שהוענקו לך במענק זה" |
| Price at Grant | Decimal | 0 | User Input | Stock price on grant date (for tax basis) | "מחיר המניה ביום ההענקה. משמש לחישוב בסיס מס" |
| Vesting Period | Number | 4 | User Input | Years until fully vested | "מספר שנים עד שכל המניות יהיו שלך (בדרך כלל 4 שנים)" |
| Vesting Schedule | Object | Standard | Calculated | When shares vest (default: 1-year cliff then 25% yearly) | "לוח זמנים: Standard = שנה אחת המתנה, אז 25% בכל שנה" |
| Vested Shares (as of today) | Number | 0 | Calculated | Shares already vested | "מניות שכבר נרכשו ושייכות לך היום (מחושב אוטומטית)" |
| Unvested Shares | Number | Total | Calculated | Shares not yet vested | "מניות שעדיין ממתינות לווסטינג. ⚠️ אובדות אם עוזבים את החברה" |
| Current Value | Decimal | 0 | Calculated | Current market value (vested + unvested) | "שווי שוק נוכחי = (נרכש + ממתין) × מחיר נוכחי" |
| Tax-Advantaged Date | Date | Grant+2yrs | Calculated | When Section 102 benefit applies | "תאריך זכאות למס מופחת (102): שנתיים מיום ההענקה" |

#### 3.1.3 Grant Table Columns
Display table with sortable columns (each header has ⓘ icon with tooltip):
1. **מס'** (ID) - Grant number | Tooltip: "מספר מזהה למענק"
2. **תאריך הענקה** (Grant Date) - MM/YYYY format | Tooltip: "מתי קיבלת את המענק"
3. **כמות מניות** (Shares) - Total granted | Tooltip: "סה״כ מניות במענק זה"
4. **מחיר בהענקה** (Grant Price) - Price at grant | Tooltip: "מחיר המניה ביום ההענקה (בסיס מס)"
5. **תקופת ווסטינג** (Vesting) - Years | Tooltip: "שנים עד שכל המניות יהיו שלך"
6. **נרכש עד כה** (Vested) - Shares vested as of today | Tooltip: "מניות שכבר שייכות לך היום"
7. **ממתין** (Unvested) - Shares not yet vested | Tooltip: "מניות שעדיין לא נרכשו. יאבדו אם תעזוב את החברה"
8. **שווי נוכחי** (Current Value) - Total current value | Tooltip: "שווי שוק נוכחי של כל המניות (נרכש + ממתין)"
9. **זכאות 102** (102 Eligible) - Date when 102 benefit kicks in | Tooltip: "תאריך זכאות למס מופחת (שנתיים מההענקה)"
10. **Actions** - Edit/Delete buttons

#### 3.1.4 Infographics (Top Summary Cards)
**Each card has hover tooltip explaining the calculation:**

<table>
<tr>
<td align="center" width="25%">

**סה"כ מניות ⓘ**

### 4,000

📊

<sub>סכום כל המניות<br/>שהוענקו מכל<br/>המענקים</sub>

</td>
<td align="center" width="25%">

**שווי נוכחי ⓘ**

### $720,000

💰

<sub>נרכש + ממתין<br/>× מחיר נוכחי</sub>

</td>
<td align="center" width="25%">

**נרכש ⓘ**

### 1,500 (38%)

✅

<sub>מניות שכבר<br/>שייכות לך</sub>

</td>
<td align="center" width="25%">

**ממתין ⓘ**

### 2,500 (62%)

⏳

<sub>מניות שעדיין לא שלך<br/>אובדות אם עוזבים</sub>

</td>
</tr>
</table>

**Tooltip Implementation:**
- Hover over card title: Shows calculation formula
- Hover over number: Shows breakdown by grant
- Click ⓘ icon: Opens detailed explanation modal

### 3.2 Liquidation Strategies

#### 3.2.1 Strategy 1: Sell 2 Years After Grant (Full Section 102)
**Name:** "מכירה שנתיים לאחר הענקה - מיטוב מס 102"

**Logic:**
- When shares vest, they are held (not sold)
- Exactly 2 years after grant date, all vested shares from that grant are sold
- **Early retirement handling:**
  - At retirement date: All unvested RSUs are forfeited (lost)
  - Only vested shares at retirement are kept
  - Continue selling vested shares 2 years after grant as planned
  - No new shares vest after retirement
- Tax calculation:
  - Marginal Tax = MIN(Grant Price, Sale Price) × Shares × Marginal Tax Rate
  - Capital Gains = (Sale Price - Grant Price) × Shares (if positive)
  - Capital Gains Tax Rate = Global Capital Gains Tax (typically 25%)
  - 3% Surtax = Applied if user exceeds income threshold (₪721,560)
  - Effective Capital Gains Rate = Capital Gains Tax + (3% if surtax applies)
  - Capital Gains Tax = Capital Gains × Effective Capital Gains Rate
  - Total Tax = Marginal Tax + Capital Gains Tax
  - Net Proceeds = (Sale Price × Shares) - Total Tax
- Net proceeds added to portfolio

**Example:**
```
Grant: 1000 shares @ $100 on Jan 1, 2023
Vesting: Standard (1-year cliff, then 25% yearly)

Timeline:
- Jan 1, 2024: 250 shares vest (cliff) → Hold
- Jan 1, 2025: 250 shares vest → Hold (and sell 2023's 250 shares @ market price)
- Jan 1, 2026: 250 shares vest → Hold (and sell 2024's 250 shares)
- Jan 1, 2027: 250 shares vest → Hold (and sell 2025's 250 shares)
- Jan 1, 2028: Sell 2026's 250 shares
- Jan 1, 2029: Sell 2027's 250 shares
```

**Pros:**
- Maximum tax benefit (25% capital gains + 3% surtax on all gains)
- Predictable tax rate
- Works best when retirement is after all grants are fully vested

**Cons:**
- Concentration risk (holding unvested + vested shares)
- Delayed liquidity
- **High forfeiture risk**: If retire before grants fully vest, lose all unvested shares
- Requires careful timing of retirement date to maximize vested shares

#### 3.2.2 Strategy 2: Sell at Early Retirement (Partial Section 102)
**Name:** "מכירה בעת פרישה - 102 חלקי"

**Logic:**
- When early retirement year is reached:
  - **All unvested RSUs are forfeited** (standard employment termination rule)
  - Sell all vested shares that were granted ≥2 years ago (Section 102 applies)
  - Hold vested shares granted <2 years ago until they reach 2-year eligibility
  - Post-retirement: Sell remaining vested shares when they reach 2-year mark
- Tax calculation:
  - Section 102 eligible (2+ years from grant): Capital gains tax only
  - Not eligible (<2 years): Higher tax burden (income tax at vest + capital gains)
- **Critical**: Total RSU value realized = only shares vested by retirement date

**Example:**
```
Early Retirement: Jan 1, 2027

Grants:
- Grant A: 1000 shares granted Jan 2023 → All vested by 2027 → Sell (102 applies)
- Grant B: 800 shares granted Jan 2026 → Partially vested → Hold until Jan 2028

At retirement (2027):
- Sell all Grant A vested shares (102 rate: 25%)
- Keep Grant B, sell in 2028
```

**Pros:**
- Immediate liquidity at retirement for vested shares
- Some Section 102 benefit on grants 2+ years old
- Reduces concentration risk earlier
- **Lower forfeiture risk**: Can retire earlier since you sell what you have
- More flexibility in retirement timing

**Cons:**
- All unvested RSUs forfeited at retirement
- Less tax benefit than Strategy 1 for recently granted shares (<2 years)
- Higher total tax if retire with many shares not yet 102-eligible
- May sacrifice significant unvested value by retiring early

### 3.2.3 MVP Scope Decision
**Phase 1 (MVP):** Implement Strategy 1 only
- Rationale: Most tax-optimal strategy, less complex
- Users with early retirement needs can use Strategy 1 with adjusted timing

**Phase 2:** Add Strategy 2
- After validating core calculations with real users
- Based on user feedback and demand

### 3.3 Calculations & Data Model

#### 3.3.1 New Models (C#)

**src/Models/RsuModels.cs:**
```csharp
public class RsuGrant
{
    public int Id { get; set; }
    public DateTime GrantDate { get; set; }
    public int NumberOfShares { get; set; }
    public decimal PriceAtGrant { get; set; }
    public string Currency { get; set; } = "$";
    public int VestingPeriodYears { get; set; } = 4;
    public VestingScheduleType VestingType { get; set; } = VestingScheduleType.Standard;
    
    // Calculated properties (computed at runtime)
    public int VestedShares(DateTime asOfDate) { /* logic */ }
    public int UnvestedShares(DateTime asOfDate) { /* logic */ }
    public DateTime Section102EligibleDate => GrantDate.AddYears(2);
    public decimal CurrentValue(decimal currentPrice) { /* logic */ }
}

public enum VestingScheduleType
{
    Standard,   // 1-year cliff, then 25% yearly (most common)
    // Phase 2 vesting types:
    // Quarterly,  // 25% per year, paid quarterly
    // Yearly,     // 25% per year, annual from start
    // Cliff,      // 100% after N years
    // Custom      // User-defined schedule
}

public class RsuConfiguration
{
    public string StockSymbol { get; set; } = string.Empty;
    public decimal CurrentPricePerShare { get; set; }
    public string Currency { get; set; } = "$";
    public decimal ExpectedAnnualReturn { get; set; } = 0; // Expected growth rate in %
    public string ReturnMethod { get; set; } = "CAGR"; // "CAGR" or "Fixed"
    public int DefaultVestingPeriodYears { get; set; } = 4;
    public RsuLiquidationStrategy LiquidationStrategy { get; set; } = RsuLiquidationStrategy.SellAfter2Years;
    
    // RSU-specific tax settings
    public decimal MarginalTaxRate { get; set; } = 47m; // User's marginal income tax rate in %
    public bool SubjectTo3PercentSurtax { get; set; } = true; // Annual income > ₪721,560
    // Note: Capital gains tax rate is inherited from FirePlanInput.CapitalGainsTax
    
    public List<RsuGrant> Grants { get; set; } = new();
}

public enum RsuLiquidationStrategy
{
    SellAfter2Years,        // Strategy 1: Full Section 102
    SellAtRetirement        // Strategy 2: Partial Section 102
}

public class RsuYearlyData
{
    public int Year { get; set; }
    public int SharesVested { get; set; }
    public int SharesSold { get; set; }
    public int SharesHeld { get; set; }
    public int SharesForfeited { get; set; } // Unvested shares lost at retirement
    public decimal MarketValue { get; set; }
    public decimal ForfeitedValue { get; set; } // Value of forfeited shares
    public decimal SaleProceeds { get; set; }
    public decimal TaxesPaid { get; set; }
    public decimal NetProceeds { get; set; }
    public List<RsuTransaction> Transactions { get; set; } = new();
}

public class RsuTransaction
{
    public int GrantId { get; set; }
    public DateTime TransactionDate { get; set; }
    public RsuTransactionType Type { get; set; }
    public int Shares { get; set; }
    public decimal PricePerShare { get; set; }
    public decimal TaxRate { get; set; }
    public decimal TaxAmount { get; set; }
    public bool Section102Applied { get; set; }
}

public enum RsuTransactionType
{
    Vest,
    Sell,
    Hold,
    Forfeit  // Unvested shares lost upon resignation/retirement
}
```

#### 3.3.2 Calculation Service

**src/Services/RsuCalculator.cs:**
```csharp
public interface IRsuCalculator
{
    RsuYearlyData[] ProjectRsuTimeline(RsuConfiguration config, int startYear, int endYear, int retirementYear);
    decimal[] ProjectStockPrices(decimal currentPrice, decimal annualReturn, string method, int years);
    decimal CalculateSection102Tax(RsuGrant grant, decimal salePrice);
    decimal CalculateRegularTax(RsuGrant grant, decimal salePrice, decimal vestingPrice);
    RsuSummary GetCurrentSummary(RsuConfiguration config, DateTime asOfDate);
}

public class RsuCalculator : IRsuCalculator
{
    // Stock price projection (similar to portfolio assets)
    public decimal[] ProjectStockPrices(decimal currentPrice, decimal annualReturn, string method, int years)
    {
        var prices = new decimal[years + 1];
        prices[0] = currentPrice;
        
        for (int i = 1; i <= years; i++)
        {
            if (method == "CAGR")
                prices[i] = currentPrice * (decimal)Math.Pow(1 + (double)annualReturn / 100, i);
            else // Fixed
                prices[i] = prices[i - 1] * (1 + annualReturn / 100);
        }
        
        return prices;
    }
    
    // Vesting calculation with 1-year cliff support
    public int CalculateVestedShares(RsuGrant grant, DateTime asOfDate)
    {
        var elapsedYears = (asOfDate - grant.GrantDate).TotalDays / 365.25;
        if (elapsedYears >= grant.VestingPeriodYears)
            return grant.NumberOfShares;
        
        if (grant.VestingType == VestingScheduleType.Standard)
        {
            // 1-year cliff: nothing vests until 1 year, then 25% yearly
            if (elapsedYears < 1.0)
                return 0;
            var yearsAfterCliff = elapsedYears - 1.0;
            var vestingRate = 0.25 + (yearsAfterCliff * 0.25); // 25% at 1yr, then 25%/yr
            return (int)(grant.NumberOfShares * Math.Min(1.0, vestingRate));
        }
        
        // Other vesting types (linear)
        var linearRate = elapsedYears / grant.VestingPeriodYears;
        return (int)(grant.NumberOfShares * linearRate);
    }
    
    // Section 102 tax: Marginal tax on grant value + capital gains tax on appreciation
    public decimal CalculateSection102Tax(
        RsuGrant grant, 
        decimal salePrice, 
        int sharesSold, 
        decimal marginalTaxRate,
        decimal capitalGainsTaxRate,
        bool subjectTo3PercentSurtax)
    {
        // Marginal tax on the lower of grant price or sale price
        var taxableGrantValue = Math.Min(grant.PriceAtGrant, salePrice) * sharesSold;
        var marginalTax = taxableGrantValue * (marginalTaxRate / 100m);
        
        // Capital gains tax on appreciation (if any)
        var capitalGains = Math.Max(0, (salePrice - grant.PriceAtGrant) * sharesSold);
        
        // Apply capital gains tax + 3% surtax if applicable
        var effectiveCapitalGainsRate = capitalGainsTaxRate / 100m;
        if (subjectTo3PercentSurtax)
            effectiveCapitalGainsRate += 0.03m; // Add 3% surtax
        
        var capitalGainsTax = capitalGains * effectiveCapitalGainsRate;
        
        return marginalTax + capitalGainsTax;
    }
    
    // Regular tax (no Section 102): Marginal tax on grant + income tax at vest + capital gains
    public decimal CalculateRegularTax(
        RsuGrant grant, 
        decimal vestPrice, 
        decimal salePrice, 
        int sharesSold, 
        decimal marginalTaxRate,
        decimal capitalGainsTaxRate,
        bool subjectTo3PercentSurtax)
    {
        // Marginal tax on grant value (or sale price if lower)
        var taxableGrantValue = Math.Min(grant.PriceAtGrant, salePrice) * sharesSold;
        var marginalTax = taxableGrantValue * (marginalTaxRate / 100m);
        
        // Income tax on appreciation from grant to vest
        var incomeAtVest = Math.Max(0, (vestPrice - grant.PriceAtGrant) * sharesSold);
        var incomeTax = incomeAtVest * (marginalTaxRate / 100m);
        
        // Capital gains tax on appreciation from vest to sale
        var capitalGains = Math.Max(0, (salePrice - vestPrice) * sharesSold);
        
        // Apply capital gains tax + 3% surtax if applicable
        var effectiveCapitalGainsRate = capitalGainsTaxRate / 100m;
        if (subjectTo3PercentSurtax)
            effectiveCapitalGainsRate += 0.03m; // Add 3% surtax
        
        var capitalGainsTax = capitalGains * effectiveCapitalGainsRate;
        
        return marginalTax + incomeTax + capitalGainsTax;
    }
    
    // Project RSU timeline based on strategy
    public RsuYearlyData[] ProjectRsuTimeline(RsuConfiguration config, int startYear, int endYear, int retirementYear)
    {
        // Project stock prices based on user-specified expected returns
        var projectedPrices = ProjectStockPrices(
            config.CurrentPricePerShare,
            config.ExpectedAnnualReturn,
            config.ReturnMethod,
            endYear - startYear
        );
        
        var yearlyData = new List<RsuYearlyData>();
        var heldShares = new List<HeldShare>(); // Track which shares are held
        var hasRetired = false;
        
        for (int year = startYear; year <= endYear; year++)
        {
            var yearData = new RsuYearlyData { Year = year };
            var currentDate = new DateTime(year, 1, 1);
            
            // Check if this is retirement year
            if (year == retirementYear && !hasRetired)
            {
                hasRetired = true;
                // FORFEIT all unvested RSUs - they are lost upon resignation
                foreach (var grant in config.Grants)
                {
                    var unvested = grant.NumberOfShares - grant.VestedShares(currentDate);
                    if (unvested > 0)
                    {
                        yearData.SharesForfeited += unvested; // Track forfeited shares
                    }
                }
            }
            
            // Process vesting for all grants (only if still employed)
            if (!hasRetired)
            {
                foreach (var grant in config.Grants)
                {
                    var vestedThisYear = /* calculate newly vested shares */;
                    if (vestedThisYear > 0)
                    {
                        yearData.SharesVested += vestedThisYear;
                        heldShares.Add(new HeldShare { GrantId = grant.Id, ... });
                    }
                }
            }
            
            // Apply liquidation strategy
            if (config.LiquidationStrategy == RsuLiquidationStrategy.SellAfter2Years)
            {
                // Strategy 1: Sell shares that vested 2+ years ago
                var sharesToSell = heldShares.Where(s => 
                    (currentDate - s.GrantDate).TotalDays >= 730).ToList();
                
                foreach (var share in sharesToSell)
                {
                    var tax = CalculateSection102Tax(
                        share.Grant, 
                        projectedPrices[year], 
                        share.Shares, 
                        config.MarginalTaxRate,
                        globalCapitalGainsTaxRate, // From FirePlanInput.CapitalGainsTax
                        config.SubjectTo3PercentSurtax
                    );
                    yearData.TaxesPaid += tax;
                    yearData.SaleProceeds += (projectedPrices[year] * share.Shares) - tax;
                    yearData.SharesSold += share.Shares;
                }
            }
            else // SellAtRetirement
            {
                if (year >= retirementYear)
                {
                    // Sell 102-eligible shares
                    // Hold others until eligible
                }
            }
            
            yearData.SharesHeld = heldShares.Sum(s => s.Shares);
            yearlyData.Add(yearData);
        }
        
        return yearlyData.ToArray();
    }
}
```

### 3.4 Integration with FIRE Calculations

#### 3.4.1 Updated FirePlanInput Model
```csharp
public class FirePlanInput
{
    // ... existing properties ...
    
    // New RSU properties
    public RsuConfiguration? RsuConfiguration { get; set; }
    public bool IncludeRsuInCalculations { get; set; } = true;
}
```

#### 3.4.2 Updated FireCalculationResult Model
```csharp
public class FireCalculationResult
{
    // ... existing properties ...
    
    // New RSU results
    public RsuYearlyData[] RsuTimeline { get; set; } = Array.Empty<RsuYearlyData>();
    public decimal TotalRsuValueAtRetirement { get; set; }
    public decimal TotalRsuTaxesPaid { get; set; }
    public RsuSummary CurrentRsuSummary { get; set; } = new();
}

public class RsuSummary
{
    public int TotalSharesGranted { get; set; }
    public int TotalSharesVested { get; set; }
    public int TotalSharesUnvested { get; set; }
    public int TotalSharesHeld { get; set; }
    public int TotalSharesSold { get; set; }
    public int TotalSharesForfeited { get; set; } // Shares lost at retirement
    public decimal CurrentMarketValue { get; set; }
    public decimal TotalProceedsToDate { get; set; }
    public decimal ForfeitedValue { get; set; } // Dollar value of forfeited shares
    public decimal ForfeiturePercentage { get; set; } // % of total grant value lost
}
```

#### 3.4.3 Updated YearlyData Model
```csharp
public class YearlyData
{
    // ... existing properties ...
    
    // New RSU data per year
    public int RsuSharesVested { get; set; }
    public int RsuSharesSold { get; set; }
    public decimal RsuSaleProceeds { get; set; }
    public decimal RsuTaxesPaid { get; set; }
    public decimal RsuHoldingsValue { get; set; }
}
```

#### 3.4.4 Integration Logic
When calculating FIRE timeline:
1. Run standard portfolio calculations (existing logic)
2. Run RSU projections in parallel
3. For each year:

   **RSU Sale Proceeds (Cash Treatment):**
   - Add net proceeds (after taxes) to portfolio as CASH
   - Do NOT count as "contributions" for tax basis calculations
   - DO include in total portfolio value for FIRE withdrawal calculations
   - Implementation: `portfolioValue += rsuYearData.NetProceeds`

   **Held RSU Value (Illiquid Asset Treatment):**
   - Include in NET WORTH display: `netWorth = portfolioValue + rsuHeldValue`
   - Exclude from LIQUID ASSETS: Cannot withdraw directly
   - Display separately: "Total Assets: $X (Portfolio: $Y + RSUs: $Z)"
   - Mark as "Illiquid" in asset breakdown table

   **RSU Taxes (Cash Flow Deduction):**
   - Deduct from annual cash flow, not from portfolio directly
   - Implementation: `cashFlow -= rsuYearData.TaxesPaid`
   - Display as separate line item: "RSU Taxes Paid: $X"
   - Include in "Total Taxes" metric in summary

   **Forfeiture Tracking:**
   - At retirement year: Calculate forfeited share value
     - `forfeitedValue = unvestedShares × currentStockPrice`
   - Subtract from projected future value (opportunity cost)
   - Display as "Opportunity Cost" warning
   - If forfeiture > 10% of total grant value:
     - Show warning banner: "⚠️ Retiring now will forfeit $X"
     - Suggest alternative dates: "Wait until [date] to save $Y"

   **User Control (Phase 2):**
   - Setting: "RSU proceeds reinvestment strategy"
     - Option A: Keep as cash (safer, lower returns)
     - Option B: Auto-reinvest per portfolio allocation (higher growth)
   - Default: Keep as cash (conservative)

4. Provide "what-if" analysis: Show impact of retiring 6/12/18 months later

### 3.5 Results Tab Updates

#### 3.5.1 Summary Cards Enhancement
Add new summary cards **with interactive explanations:**

**Existing Cards:**

| שווי תיק | שווי סופי | משיכה שנתית | הוצאה חודשית |
|----------|-----------|-------------|-------------|
| Value | Value | Value | Value |

**New RSU Performance Cards:**

<table>
<tr>
<td align="center">

**הכנסות RSU נטו ⓘ**

$XXX,XXX

<sub>סה"כ כסף שקיבלת ממכירת RSU<br/>לאחר ניכוי מסים</sub>

</td>
<td align="center">

**מס RSU ששולם ⓘ**

$XX,XXX

<sub>סה"כ מס ששילמת על כל עסקאות ה-RSU<br/>(מס שולי + רווחי הון)</sub>

</td>
<td align="center">

**מניות מוחזקות ⓘ**

X,XXX

<sub>מניות שנרכשו אך<br/>עדיין לא נמכרו</sub>

</td>
</tr>
</table>

**Forfeiture Warning Cards** (if applicable):

<table>
<tr>
<td align="center" bgcolor="#FEF2F2">

**⚠️ מניות שאבדו בפרישה ⓘ**

X,XXX

<sub>מניות שלא הספיקו להירכש<br/>לפני הפרישה - אבדו לצמיתות</sub>

</td>
<td align="center" bgcolor="#FEF2F2">

**⚠️ שווי אבוד ⓘ**

$XX,XXX

<sub>ערך הדולרי של המניות שאבדו<br/>בפרישה (מחושב לפי מחיר ביום הפרישה)</sub>

</td>
<td align="center" bgcolor="#FEF2F2">

**⚠️ אחוז הפסד ⓘ**

XX%

<sub>אחוז המניות שאבדו<br/>מתוך סה"כ המניות שהוענקו</sub>

</td>
</tr>
</table>

**Tooltip Examples:**
- **הכנסות RSU נטו**: "סה״כ כסף שקיבלת ממכירת RSU לאחר ניכוי מסים"
- **מס RSU ששולם**: "סה״כ מס ששילמת על כל עסקאות ה-RSU (מס שולי + רווחי הון)"
- **מניות מוחזקות**: "מניות שנרכשו אך עדיין לא נמכרו"
- **מניות שאבדו בפרישה**: "מניות שלא הספיקו להירכש לפני הפרישה - אבדו לצמיתות"
- **שווי אבוד**: "ערך הדולרי של המניות שאבדו בפרישה (מחושב לפי מחיר ביום הפרישה)"
- **אחוז הפסד**: "אחוז המניות שאבדו מתוך סה״כ המניות שהוענקו"

**Click-to-Expand Feature:**
Clicking card opens modal with:
- Formula breakdown
- Year-by-year contribution
- Strategy impact comparison
- Tips for optimization

**Forfeiture Warning:** If user's retirement date will cause significant forfeiture (>10% of total grant value), display prominent warning:
```
⚠️ אזהרה: פרישה בתאריך זה תגרום לאובדן של X מניות בשווי $Y
שקול לדחות פרישה ל-[suggested date] כדי למזער הפסדים
```

#### 3.5.2 New Charts

**All charts must have:**
- **Legend with tooltips**: Hover over legend item explains what it represents
- **Data point tooltips**: Hover over any point shows calculation breakdown
- **Axis labels with units**: Clear "($)" or "(מניות)" labels
- **Annotations**: Key events marked (retirement, 102 eligibility, forfeiture)

**Chart 1: RSU Value Over Time (Line Chart)**
- **X-axis:** Years
- **Y-axis:** Value ($) - with tooltip: "שווי שוק של המניות"
- **Lines:**
  - Total RSU Market Value (vested + unvested) - Tooltip: "סה״כ שווי כל המניות (נרכש + ממתין)"
  - Vested RSUs Value - Tooltip: "שווי המניות שכבר שייכות לך"
  - Held RSUs Value (not yet sold) - Tooltip: "שווי מניות שנרכשו אך טרם נמכרו"
- **Colors:** Blue, Green, Orange
- **Annotations:**
  - Vertical line at retirement with label: "פרישה מוקדמת"
  - Shaded region before retirement: "עדיין עובד" (gray)
  - Shaded region after: "לאחר פרישה" (light blue)

**Chart 2: RSU Share Distribution Over Time (Stacked Area Chart)**
- **X-axis:** Years
- **Y-axis:** Number of Shares - with tooltip: "כמות מניות"
- **Areas (each with hover explanation):**
  - Unvested Shares (gray) - Tooltip: "מניות שעדיין לא נרכשו. יאבדו אם תעזוב"
    - Drops to zero at retirement
  - Vested & Held Shares (yellow) - Tooltip: "מניות שנרכשו ועדיין לא נמכרו"
  - Sold Shares (green) - Tooltip: "מניות שנמכרו - הכסף כבר בתיק"
  - **Forfeited Shares (red)** - Tooltip: "מניות שאבדו בפרישה (לא הספיקו להירכש)"
    - Shown as negative spike at retirement year
- **Retirement line**: Vertical line marking retirement date with label
- **Forfeiture annotation**: Popup on hover showing:
  - "X מניות אבדו בפרישה"
  - "שווי: $Y"
  - "היה שווה לחכות Z חודשים"

**Chart 3: RSU Tax Impact (Bar Chart)**
- **X-axis:** Years
- **Y-axis:** $ Amount - with tooltip: "סכומים בדולרים"
- **Bars (stacked with hover breakdown):**
  - Sale Proceeds (green) - Tooltip: "סה״כ כסף ממכירה לפני מס"
    - On hover: Shows shares sold × price
  - Taxes Paid (red, stacked breakdown) - Tooltip on hover shows:
    - "מס שולי: $X (Y%)"
    - "מס רווחי הון: $Z (W%)"
    - "מס יסף 3%: $V" (if applicable)
    - "סה״כ מס: $Total"
  - Net Proceeds (blue) - Tooltip: "כסף נטו לאחר ניכוי מסים"
- **Legend with explanations:**
  - Each legend item clickable for detailed tax formula modal

#### 3.5.3 Updated Main Portfolio Chart
- Add RSU proceeds as cash inflows (separate color/pattern)
- Show RSU holdings as part of total net worth (dashed line)

### 3.6 UI/UX Requirements

#### 3.6.0 Number Transparency & Tooltips (CRITICAL)
**Every calculated or displayed number must have explanatory help text:**

**Implementation Methods:**
1. **Hover Tooltips:** All table headers, card titles, and calculated fields
2. **ⓘ Info Icons:** Next to complex calculations (click for detailed modal)
3. **Inline Help Text:** Below input fields (gray, smaller font)
4. **Calculation Breakdown:** Expandable sections showing formula steps
5. **Color Coding:** Visual indicators (green = yours, gray = not yet, red = lost)

**Implementation Strategy - Progressive Disclosure:**

**Tier 1: Always Visible (No Clutter)**
- Section headers with ⓘ icon (click for explanation)
- Input fields with inline help text below
- Color coding (no explanation needed if intuitive)

**Tier 2: On Hover (Desktop Only)**
- Table headers: Show tooltip on hover
- Chart data points: Show value + calculation on hover
- Summary cards: Show breakdown on hover

**Tier 3: On Click (All Devices)**
- ⓘ icons: Open modal with detailed explanation
- "Explain this" link: Opens calculation breakdown
- First-time user: Auto-show tooltip tour

**Tier 4: Help Mode Toggle (Optional)**
- Global toggle: "מצב עזרה" (Help Mode)
- When enabled: Shows all tooltips inline (not on hover)
- Sticky setting: Remembers preference

**Accessibility Considerations:**
- Use aria-describedby for screen readers
- Keyboard navigation: Tab to element, Shift+F1 for help
- Don't rely solely on hover (mobile-friendly alternative)
- High contrast mode: Ensure tooltips visible

**Examples:**
```html
<!-- Input field with inline help -->
<label>מס שולי (%)
  <input type="number" value="47" />
  <span class="help-text">מדרגת המס השולית שלך. בדרך כלל 31-50% לפי הכנסה</span>
</label>

<!-- Tier 1: Header with icon -->
<th id="vested-header">
  נרכש עד כה
  <button aria-describedby="vested-tooltip" onclick="showHelp('vested')">
    ⓘ
  </button>
</th>

<!-- Tier 2: Hover tooltip (desktop) -->
<div id="vested-tooltip" role="tooltip" class="hidden hover:block">
  מניות שכבר נרכשו ושייכות לך (מחושב אוטומטית לפי תאריך היום)
</div>

<!-- Card with calculation breakdown -->
<div class="card" title="חישוב: סה״כ מניות מכל המענקים">
  <h3>סה"כ מניות ⓘ</h3>
  <div class="value">4,000</div>
  <button onclick="showBreakdown('total-shares')">הצג פירוט</button>
</div>
```

**Zero-Ambiguity Test (Revised):**
- IF user asks "מה זה?" about a number
- AND Tier 1-3 explanations exist
- THEN we pass (not a failure)
- User should be able to FIND explanation within 1 click

#### 3.6.1 Hebrew RTL Support
- All RSU labels in Hebrew
- Right-to-left table layout
- Date format: DD/MM/YYYY
- Number format: 1,000.00 with comma separators

#### 3.6.2 Validation & Error Handling
| Validation | Error Message (Hebrew) | Tooltip/Help Available |
|------------|------------------------|------------------------|
| Stock symbol empty | "יש למלא סימול מניה" | "סימול מסחר של החברה, לדוגמה: GOOGL" |
| Grant date in future | "תאריך הענקה לא יכול להיות בעתיד" | "התאריך בו קיבלת את המענק מהחברה" |
| Number of shares ≤ 0 | "מספר מניות חייב להיות גדול מאפס" | "כמה מניות הוענקו לך במענק זה" |
| Vesting period < 1 or > 10 | "תקופת ווסטינג חייבת להיות בין 1-10 שנים" | "מספר שנים עד שכל המניות יהיו שלך" |
| Price ≤ 0 | "מחיר חייב להיות גדול מאפס" | "מחיר המניה ביום ההענקה (בסיס מס)" |
| Marginal tax rate < 0 or > 100 | "מס שולי חייב להיות בין 0-100%" | "מדרגת המס השולית שלך (31-50%)" |
| Capital gains tax invalid | "מס רווחי הון לא תקין (מהגדרות תוכנית)" | "מס על רווחים משקעות (בד״כ 25%)" |
| Duplicate grant ID | "מס' מענק כבר קיים" | "כל מענק צריך מספר ייחודי" |

#### 3.6.3 User Actions
1. **Add Grant:** Modal form with all fields, validates on submit
2. **Edit Grant:** Pre-fill modal, allow changes, recalculate on save
3. **Delete Grant:** Confirmation dialog: "האם למחוק את מענק #X?"
4. **Fetch Price:** Button to refresh stock price via Finnhub API
5. **Sort Table:** Click column header to sort (ascending/descending)
6. **Strategy Change:** Recalculate entire timeline when strategy changes

#### 3.6.4 Responsive Design
- Mobile (< 768px): Stack cards vertically, single-column table
- Tablet (768-1024px): Two-column layout
- Desktop (> 1024px): Full three-column layout with side-by-side charts

##### 3.6.4.1 Mobile-Specific Design (< 768px)

**RSU Grant Table → Card View:**
```html
<!-- Desktop: 10-column table -->
<!-- Mobile: Card per grant -->
<div class="grant-card" style="border: 1px solid #e5e7eb; padding: 16px; margin-bottom: 12px;">
  <div class="flex justify-between items-start mb-2">
    <span class="font-bold text-lg">מענק #1</span>
    <div>
      <button>✏️</button>
      <button>🗑️</button>
    </div>
  </div>
  
  <div class="grid grid-cols-2 gap-2 text-sm">
    <div>
      <span class="text-gray-600">תאריך:</span>
      <span class="font-medium">01/2023</span>
    </div>
    <div>
      <span class="text-gray-600">מניות:</span>
      <span class="font-medium">1000</span>
    </div>
    <div>
      <span class="text-gray-600">נרכש:</span>
      <span class="text-green-600 font-medium">250 (25%)</span>
    </div>
    <div>
      <span class="text-gray-600">ממתין:</span>
      <span class="text-gray-500 font-medium">750 (75%)</span>
    </div>
    <div class="col-span-2">
      <span class="text-gray-600">שווי:</span>
      <span class="font-bold text-lg">$150,000</span>
    </div>
  </div>
  
  <!-- Expandable details -->
  <button class="text-blue-500 text-sm mt-2" onclick="expandDetails(1)">
    הצג פרטים מלאים ▼
  </button>
</div>
```

**Summary Cards → Vertical Stack:**
- 1 card per row (not 4 across)
- Larger font sizes for readability
- Touch-friendly spacing (min 44px touch targets)

**Charts → Full Width:**
- Rotate to landscape for better viewing (optional)
- Pinch-to-zoom enabled
- Simplified legend (bottom, not side)
- Tap data points for tooltip (not hover)

**Forms (Add/Edit Grant) → Full-Screen Modal:**
- Overlay entire viewport
- Step-by-step wizard (not all fields at once):
  - Step 1: Basic info (symbol, date, shares)
  - Step 2: Pricing (grant price, current price)
  - Step 3: Vesting (period, schedule)
- Large input fields (min 44px height)
- "Next" / "Previous" buttons for navigation
- Progress indicator: "שלב 1 מתוך 3"

**Navigation Tabs → Swipeable:**
- Swipe left/right to change tabs
- Visual indicator: Dots below tabs
- Haptic feedback on tab change (if supported)

##### 3.6.4.2 Tablet-Specific (768-1024px)
- 2-column layout for summary cards (not 4)
- Table remains table (not card view)
- Charts side-by-side if space allows, else stacked

##### 3.6.4.3 Touch Interactions
- **Tap:** Select / open
- **Long press:** Show context menu (edit, delete)
- **Swipe left on card:** Delete action
- **Swipe right on card:** Edit action
- **Pinch:** Zoom charts
- **Double tap:** Reset zoom

#### 3.6.5 Error Recovery & Edge Cases

##### 3.6.5.1 API Failures (Finnhub)
**Scenario:** Stock price fetch fails during calculation

**Handling:**
1. **Immediate:** Show warning toast: "לא ניתן לשלוף מחיר נוכחי. אנא הזן ידנית"
2. **Fallback:** Use last cached price (if < 24 hours old)
   - Display: "Using cached price from [timestamp]"
3. **Manual Override:** Allow user to enter price manually
   - Warning: "⚠️ מחיר ידני - לא מעודכן אוטומטית"
4. **Retry:** "נסה שוב" button to re-fetch
5. **Continue:** Calculation proceeds with manual/cached price

**Implementation:**
```javascript
async function fetchStockPrice(symbol) {
  try {
    const price = await finnhubApi.getPrice(symbol);
    cachePrice(symbol, price, Date.now());
    return price;
  } catch (error) {
    const cachedPrice = getCachedPrice(symbol);
    if (cachedPrice && cachedPrice.age < 86400000) { // 24 hours
      showWarning('Using cached price from ' + cachedPrice.timestamp);
      return cachedPrice.value;
    }
    throw new Error('Price unavailable. Please enter manually.');
  }
}
```

##### 3.6.5.2 Invalid Retirement Dates
**Edge Case 1:** Retirement year before all grant dates
- **Detection:** `retirementYear < Math.min(...grants.map(g => g.grantDate.year))`
- **Handling:** Show warning: "⚠️ פרישה לפני כל המענקים. לא יתקבלו מניות"
- **Display:** All grants marked "לא יתממש" (will not realize)
- **Calculation:** RSU value = $0 (all forfeited)

**Edge Case 2:** Grant date after retirement
- **Detection:** `grant.grantDate > retirementDate`
- **Handling:** 
  - Option A: Exclude from calculations silently
  - Option B: Show warning: "מענק #X לאחר פרישה - מושבת"
- **Recommendation:** Option B (transparency)
- **Display:** Gray out grant row with warning icon

**Edge Case 3:** Retirement date = Grant date
- **Handling:** 0 shares vested (cliff not reached)
- **Warning:** "⚠️ פרישה ביום ההענקה - כל המניות יאבדו"

##### 3.6.5.3 Invalid Stock Prices
**Edge Case 1:** Price = $0
- **Validation:** Prevent save, show error: "מחיר מניה חייב להיות גדול מאפס"
- **Reason:** Likely data entry error, not bankruptcy

**Edge Case 2:** Negative price
- **Validation:** Hard block, show error: "מחיר מניה לא יכול להיות שלילי"

**Edge Case 3:** Extreme price (>$10,000 or <$0.01)
- **Validation:** Show warning: "⚠️ מחיר חריג. אנא אמת"
- **Allow:** User can proceed (might be legitimate)

##### 3.6.5.4 Performance Limits
**Scenario:** User tries to add 100 grants

**Limits:**
- **Soft Limit (30 grants):** Show warning
  - "⚠️ מספר רב של מענקים עלול להאט חישובים"
- **Hard Limit (50 grants):** Block addition
  - "הגעת למגבלת 50 מענקים. מחק מענקים ישנים או פנה לתמיכה"

**Rationale:** 
- 50 grants × 40 years × 12 months = 24,000 data points
- Should still compute in < 500ms on modern devices

**Future:** If demand for >50 grants, optimize or offer "Pro" tier

##### 3.6.5.5 Calculation Errors
**Scenario:** Exception thrown during RSU calculations

**Handling:**
1. **Catch:** Try-catch around `RsuCalculator.ProjectRsuTimeline()`
2. **Log:** Send to error tracking (Sentry/similar)
3. **Display:** User-friendly message:
   - "שגיאה בחישוב RSU. אנא נסה שנית או פנה לתמיכה"
   - Button: "דווח על שגיאה" (opens pre-filled support form)
4. **Fallback:** Continue FIRE calculation without RSU data
   - Warning: "חישוב FIRE כללי (ללא RSU)"
5. **Debug Mode:** If dev mode, show stack trace

##### 3.6.5.6 Browser Compatibility
**Unsupported Features:**
- LocalStorage unavailable (private mode)
- Chart.js fails to load
- SubtleCrypto unavailable (old browser)

**Handling:**
- **Detection:** Feature detection on page load
- **Warning:** "דפדפן זה אינו נתמך במלואו. שדרג ל-Chrome/Firefox/Safari עדכני"
- **Graceful Degradation:**
  - No encryption: Data stored unencrypted with warning
  - No charts: Show tabular data only
  - No localStorage: Session-only (data lost on refresh)

---

## 4. Technical Implementation

### 4.1 Backend Changes

#### 4.1.1 New Files
- **src/Models/RsuModels.cs** - RSU data models
- **src/Services/RsuCalculator.cs** - RSU calculation engine
- **src/Controllers/RsuController.cs** (optional) - Dedicated RSU endpoints

#### 4.1.2 Modified Files
- **src/Models/FirePlanModels.cs** - Add RSU properties to FirePlanInput/Result
- **src/Services/FireCalculator.cs** - Integrate RSU calculations
- **src/Controllers/FirePlanController.cs** - Handle RSU data in calculate endpoint

#### 4.1.3 API Endpoints
Update existing `/api/fireplan/calculate` to accept RSU configuration:
```json
{
  "birthYear": 1990,
  "earlyRetirementYear": 2035,
  // ... existing fields ...
  "rsuConfiguration": {
    "stockSymbol": "GOOGL",
    "currentPricePerShare": 150.00,
    "currency": "$",
    "expectedAnnualReturn": 12.0,
    "returnMethod": "CAGR",
    "defaultVestingPeriodYears": 4,
    "liquidationStrategy": "SellAfter2Years",
    "marginalTaxRate": 47.0,
    "subjectTo3PercentSurtax": true,
    "grants": [
      {
        "id": 1,
        "grantDate": "2023-01-15",
        "numberOfShares": 1000,
        "priceAtGrant": 120.00,
        "currency": "$",
        "vestingPeriodYears": 4,
        "vestingType": "Standard"
      }
    ]
  }
}
```

Response includes RSU timeline and summary in result object.

### 4.2 Frontend Changes

#### 4.2.1 New Components (index.html)
- **RSU Tab Section** (~500 lines)
  - Plan settings form
  - Grant management table
  - Add/Edit grant modal
  - Summary infographics

- **RSU Charts** (~300 lines)
  - Chart.js configurations for 3 new charts
  - Data transformation logic

#### 4.2.2 JavaScript Functions
```javascript
// RSU management
function addRsuGrant(grant) { /* ... */ }
function editRsuGrant(grantId, updates) { /* ... */ }
function deleteRsuGrant(grantId, { /* ... */ }
function calculateVestedShares(grant, asOfDate) { /* ... */ }

// Tooltip & explanation system (NEW REQUIREMENT)
function initTooltips() {
  // Initialize all tooltip instances with Hebrew text
  // Use Tippy.js or native title attributes
}

function showCalculationBreakdown(metric, value, year) {
  // Opens modal with step-by-step calculation
  // Shows formula, inputs, and result
}

function formatNumberWithExplanation(value, type) {
  // Returns HTML with number + tooltip icon
  // type: 'shares', 'price', 'tax', 'percent', etc.
}

function generateTaxBreakdownHTML(transaction) {
  // Creates detailed tax calculation HTML
  // Shows: marginal tax + capital gains + surtax = total
}

// API integration
async function fetchStockPrice(symbol) { /* ... */ }
async function calculateWithRsu() { /* ... */ }

// UI updates
function renderRsuTable(grants) { 
  // Each cell includes tooltip with explanation
}
function renderRsuCharts(rsuTimeline) { 
  // Configure Chart.js tooltips with custom callbacks
}
function updateRsuSummary(summary) { 
  // Add ⓘ icons with click handlers
}
```

#### 4.2.3 Save/Load Plan Enhancement
Extend JSON schema to include RSU configuration:
```json
{
  "version": "2.0",
  "inputs": { /* ... existing ... */ },
  "rsuConfiguration": { /* full RSU config */ },
  "expenses": [ /* ... */ ],
  "portfolios": { /* ... */ }
}
```

### 4.3 Testing Requirements

#### 4.3.1 Unit Tests (xUnit)
**File:** `FirePlanningTool.Tests/Rsu/RsuCalculatorTests.cs`

Test coverage:
- Vesting calculations (quarterly, yearly, cliff)
- Section 102 tax calculations
- Regular tax calculations (income + capital gains)
- Strategy 1 (sell after 2 years) timeline projection
- Strategy 2 (sell at retirement) timeline projection
- Edge cases:
  - Grant date = retirement date
  - Zero vesting period
  - Negative stock prices (should throw)
  - Multiple grants with overlapping vesting
  - Currency conversion (USD ↔ ILS)

**Minimum 50 tests**, aiming for:
- 90%+ line coverage
- 80%+ branch coverage

#### 4.3.2 Integration Tests
**File:** `FirePlanningTool.Tests/Rsu/RsuIntegrationTests.cs`

Test scenarios:
- Full FIRE calculation with RSU grants included
- RSU proceeds correctly added to portfolio
- Tax deductions applied correctly
- Multiple strategies compared
- Save/load plan with RSUs
- API endpoint with RSU configuration

#### 4.3.3 Frontend Tests
**File:** `wwwroot/tests/rsu-tests.html`

Test coverage:
- Add/edit/delete grant UI flows
- Form validation
- Table sorting
- Chart rendering with RSU data
- Strategy switching triggers recalculation
- **Tooltip presence tests (NEW):**
  - Every calculated number has tooltip or help text
  - All table headers have ⓘ icons
  - Modal breakdowns open correctly
  - Tooltip text is in Hebrew
  - Chart tooltips show correct calculations
  - No orphaned numbers without explanations

### 4.4 Performance Requirements
- RSU calculations should complete in < 100ms for up to 20 grants
- Chart rendering should be smooth (60fps) with 40+ years of data
- API response time with RSU data: < 500ms

---

## 5. Data Examples & Test Cases

### 5.1 Example Scenario 1: Simple Grant

**Inputs:**
- Grant: 1000 shares @ $100 on Jan 1, 2023
- Vesting: 4 years, Standard (1-year cliff, then 25% yearly)
- Current price: $150
- Expected annual return: 10% CAGR
- Strategy: Sell 2 years after grant

**Expected Outputs:**
- Vested as of Nov 2025: 500 shares (0 in year 1, then 250/yr)
- Section 102 eligible: Jan 1, 2025
- Current value: $75,000 (500 vested)

**Timeline:**
| Year | Vest | Sell | Hold | Price | Marginal Tax (47%) | Cap Gains Tax (25%+3%) | Total Tax | Net Proceeds |
|------|------|------|------|-------|-------------------|----------------------|-----------|-------------|
| 2023 | 0    | 0    | 0    | $100  | $0                | $0                   | $0        | $0          |
| 2024 | 250  | 0    | 250  | $110  | $0                | $0                   | $0        | $0          |
| 2025 | 250  | 0    | 500  | $121  | $0                | $0                   | $0        | $0          |
| 2026 | 250  | 250  | 500  | $133  | $11,750           | $2,310               | $14,060   | $19,190     |
| 2027 | 250  | 250  | 500  | $146  | $11,750           | $3,220               | $14,970   | $21,530     |
| 2028 | 0    | 250  | 250  | $161  | $11,750           | $4,233               | $15,983   | $24,267     |
| 2029 | 0    | 250  | 0    | $177  | $11,750           | $5,390               | $17,140   | $27,110     |

*With 10% CAGR from $100 base price, 47% marginal tax rate, 28% capital gains (25% + 3% surtax). 1-year cliff means no vesting in 2023.*
*Marginal tax = $100 (grant price) × 250 shares × 47% = $11,750 per batch*
*Capital gains tax = (Sale Price - $100) × 250 shares × 28% (includes 3% surtax for high earners)*

### 5.2 Example Scenario 2: Multiple Grants with Retirement and Forfeiture

**Inputs:**
- Grant A: 1000 shares @ $100, granted Jan 2023, 4-year vesting
- Grant B: 800 shares @ $120, granted Jan 2025, 4-year vesting
- Grant C: 600 shares @ $140, granted Jan 2027, 4-year vesting
- Early retirement: Jan 2030
- Strategy: Sell at retirement

**Expected Behavior:**
- At retirement (Jan 2030):
  - **Grant A**: Fully vested by 2027 (1000 shares), 102 eligible (7 years old) → **Sell all**
  - **Grant B**: Fully vested by 2029 (800 shares), 102 eligible (5 years old) → **Sell all**
  - **Grant C**: Only 750 shares vested (3 years into 4-year vest), NOT 102 eligible
    - **Keep vested**: 750 shares (hold until 2029 for 102 benefit)
    - **FORFEIT**: 150 unvested shares **LOST** upon retirement
- Post-retirement:
  - Jan 2029: Sell Grant C's 750 vested shares (now 102 eligible)
  - Total loss: 150 shares × $140 = **$21,000 forfeited value**

**Key Insight**: Retiring in Jan 2031 (instead of 2030) would have saved the 150 shares worth $21,000+

### 5.3 Edge Case: Optimizing Retirement Timing to Minimize Forfeiture

**Scenario:** User has multiple grants with different vesting schedules

**Inputs:**
- Grant A: 1000 shares, fully vested
- Grant B: 800 shares, vests in 6 months
- Grant C: 1200 shares, vests in 18 months
- Desired retirement: ASAP
- Current portfolio value: Enough to retire now

**Optimization Question:** When should user actually retire?

**Options:**
1. **Retire now**: Forfeit Grant B (800 shares) + Grant C (1200 shares) = 2000 shares lost
2. **Retire in 6 months**: Forfeit only Grant C (1200 shares)
3. **Retire in 18 months**: Forfeit nothing, get all shares

**Calculation:**
- If stock = $150/share:
  - Option 1: Lose $300,000
  - Option 2: Lose $180,000 (save $120,000 by waiting 6 months)
  - Option 3: Lose $0 (save $300,000 by waiting 18 months)

**Tool Feature**: Show "forfeiture cost" of retiring at different dates to help optimize timing

### 5.4 Edge Case: Retirement Before 2-Year Mark (Original)

**Inputs:**
- Grant: 1000 shares @ $100, granted Jan 2028
- Vesting: 4 years
- Early retirement: Jan 2029 (1 year after grant)
- Strategy: Sell at retirement

**Expected Behavior:**
- At retirement (2029): 250 shares vested, but only 1 year old
- Cannot sell with Section 102 benefit
- Must hold until Jan 2030 (2 years after grant)
- Then sell with 102 benefit

**Tax comparison:**
- If sold at retirement (2029, without 102): 
  - Marginal tax (47%) on grant value
  - Income tax (47%) on appreciation to vest
  - Capital gains (25%) on vest to sale
  - Total effective rate: ~60%+ on total value
- If sold in 2030 (with Section 102): 
  - Marginal tax (47%) on grant value
  - Capital gains tax (25%) on appreciation only
  - Total effective rate: ~47% + 25% of gains ≈ lower overall
- **Potential savings: Significant reduction on appreciation portion**

---

## 6. User Flows

### 6.1 First-Time Setup Flow
1. User navigates to "מענקי RSU" tab
2. Sees empty state: "אין מענקי RSU. הוסף מענק ראשון"
3. Clicks "הוסף מענק" button
4. Fills in modal form:
   - Stock symbol: GOOGL
   - Grant date: 01/01/2023
   - Number of shares: 1000
   - Price at grant: $120
   - Vesting period: 4 years
5. Clicks "שמור" (Save)
6. Grant appears in table
7. Summary cards update with current values
8. User configures liquidation strategy dropdown
9. Clicks "חשב מחדש" (Recalculate)
10. Results tab updates with RSU projections

### 6.2 Adding Multiple Grants Flow
1. User already has 2 grants
2. Receives new grant notification from employer
3. Clicks "הוסף מענק"
4. Enters new grant details
5. System auto-increments grant ID
6. Saves successfully
7. Table re-sorts by grant date (newest first)
8. Summary cards update totals
9. Charts update with new data

### 6.3 Comparing Strategies Flow
1. User has 5 grants configured
2. Currently using Strategy 1 (sell after 2 years)
3. Wants to see impact of Strategy 2
4. Changes dropdown to "מכירה בעת פרישה"
5. Clicks "חשב מחדש"
6. Waits ~2 seconds for recalculation
7. Results tab updates:
   - Peak value changes
   - Net proceeds differ
   - Tax amounts vary
8. User compares side-by-side (could take screenshot)
9. Switches back to Strategy 1
10. Makes final decision

### 6.4 Export/Import Plan with RSUs
1. User clicks "שמור תוכנית" (Save Plan)
2. JSON file downloads with RSU configuration embedded
3. User shares file with financial advisor
4. Advisor reviews and suggests changes
5. User clicks "טען תוכנית" (Load Plan)
6. Selects modified JSON file
7. System validates RSU structure
8. Loads successfully
9. All grants appear in table
10. Results recalculate automatically

---

## 7. Design Specifications

### 7.1 Color Palette (Matching Existing Theme)
- **Primary Blue:** #3b82f6 (Tailwind blue-500)
- **RSU Accent:** #10b981 (Tailwind emerald-500) - for RSU-specific elements
- **Vested Green:** #22c55e (Tailwind green-500)
- **Unvested Gray:** #6b7280 (Tailwind gray-500)
- **Sold Gold:** #f59e0b (Tailwind amber-500)
- **Tax Red:** #ef4444 (Tailwind red-500)

### 7.2 Typography (Hebrew)
- **Font Family:** 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif
- **Headings:** 24px, bold (כותרות)
- **Subheadings:** 18px, semi-bold
- **Body Text:** 14px, regular
- **Table Headers:** 12px, bold, uppercase
- **Chart Labels:** 10px, regular

### 7.3 Iconography
- **Grants Tab Icon:** 📊 (chart)
- **Vested Shares:** ✅ (checkmark)
- **Unvested Shares:** ⏳ (hourglass)
- **Sold Shares:** 💰 (money bag)
- **Tax:** 🏦 (bank)
- **Section 102:** 🎯 (target) - indicates tax optimization

### 7.4 Spacing & Layout
- **Tab Padding:** 24px
- **Card Spacing:** 16px gap between cards
- **Table Row Height:** 48px
- **Input Height:** 40px
- **Button Height:** 44px (touch-friendly)
- **Modal Width:** 600px (desktop), 90% (mobile)

---

## 8. Risks & Mitigation

### 8.1 Technical Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Complex tax calculations | High | Medium | Thorough unit tests, consult Israeli tax expert |
| Performance with many grants | Medium | Low | Optimize calculations, cap at 20 grants |
| Finnhub API rate limits | Medium | Medium | Cache prices, fallback to manual entry |
| Currency conversion accuracy | High | Low | Use reliable exchange rate API, allow override |
| Data model migration | Low | Low | Version JSON schema, provide migration script |

### 8.2 Business Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Tax law changes | High | Medium | Make tax rates configurable, add disclaimer |
| User misunderstanding 102 | High | High | Add tooltips, link to IRS documentation |
| Feature complexity overwhelms users | Medium | Medium | Progressive disclosure, hide advanced options |
| Low adoption | Medium | Medium | A/B test, gather user feedback early |

### 8.3 Legal & Compliance
- **Disclaimer Required:** "This tool provides estimates only. Consult a licensed tax professional for advice."
- **Section 102 Complexity:** Current implementation assumes standard 102 "capital gains track" - does not cover "income track" or non-102 options
- **Future Enhancement:** Add option for other Israeli stock option plans (3(i), 102 income track)

### 8.4 Security & Privacy

#### 8.4.1 Data Storage
- **Client-Side Only:** All RSU data stored in browser localStorage
- **No Server Storage:** Backend never persists RSU configurations
- **Encryption:** LocalStorage data encrypted using SubtleCrypto API (if browser supports)
- **Data Lifetime:** Persists until user clears browser data or uses "Clear All Data" button

**Implementation Note:**
```javascript
// Encrypt before saving
const encryptedData = await encryptData(JSON.stringify(rsuConfig));
localStorage.setItem('rsuConfig', encryptedData);

// Decrypt on load
const encryptedData = localStorage.getItem('rsuConfig');
const rsuConfig = JSON.parse(await decryptData(encryptedData));
```

#### 8.4.2 Data Transmission
- **HTTPS Required:** Enforce HTTPS for all API calls
- **API Privacy:** Finnhub API calls only send stock symbol, no user data
- **No Tracking:** RSU calculations do not trigger analytics events with PII
- **Session Security:** Use secure session tokens (if authentication added later)

#### 8.4.3 Privacy Policy Requirements
**Disclosures:**
1. "Your data never leaves your device"
2. "We do not collect, store, or transmit RSU information"
3. "Stock price fetches are anonymous (no user identification)"
4. "Export/import files contain sensitive data—protect them"

**User Controls:**
1. "Clear All Data" button: Wipes all localStorage
2. "Export Data" button: Download JSON (user responsible for security)
3. "Privacy Mode" toggle: Disables analytics entirely (if any)

#### 8.4.4 Legal Disclaimers (CRITICAL)
**Display prominently on RSU tab (cannot dismiss):**

```html
<div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
  <div class="flex">
    <div class="flex-shrink-0">
      ⚠️
    </div>
    <div class="mr-3">
      <p class="text-sm text-yellow-700">
        <strong>אזהרה:</strong> כלי זה מספק הערכות בלבד ואינו מהווה ייעוץ מס או פיננסי.
        חישובי המס מבוססים על הבנתנו של סעיף 102 נכון ל-2025.
        <strong>התייעץ עם רואה חשבון מוסמך לפני קבלת החלטות פיננסיות.</strong>
      </p>
      <p class="text-xs text-yellow-600 mt-1">
        Warning: This tool provides estimates only and does not constitute tax or financial advice.
        Tax calculations are based on our understanding of Section 102 as of 2025.
        Consult a licensed accountant before making financial decisions.
      </p>
    </div>
  </div>
</div>
```

**Footer Disclaimer (all pages):**
```
© 2025 FIRE Planning Tool | For Educational Purposes Only | Not Financial Advice
```

#### 8.4.5 Liability Waiver
**Terms of Service (required before using RSU features):**
- User acknowledges calculations may contain errors
- User responsible for verifying accuracy with professionals
- Tool creators not liable for financial losses
- User agrees not to sue for incorrect calculations

**Implementation:** 
- First-time RSU tab visit: Show ToS modal (must accept to proceed)
- Checkbox: "I understand this tool is for educational purposes only"
- Store acceptance in localStorage: `tosAccepted: true`

---

## 9. Success Criteria & Metrics

### 9.1 Launch Criteria (MVP)

**Phase 1 MVP (Reduced Scope):**
- [ ] 80%+ test coverage for RSU code
- [ ] 3 core user flows functional (add, edit, calculate)
- [ ] Hebrew UI with RTL layout
- [ ] Strategy 1 (Sell after 2 years) fully functional
- [ ] 1 RSU chart (value over time) rendering
- [ ] Save/load plan includes RSUs (PHASE 2)
- [ ] Performance: < 500ms API response
- [ ] Zero critical bugs
- [ ] **100% of displayed numbers have explanatory tooltips or help text**
- [ ] **Manual review: No ambiguous numbers in UI**
- [ ] **User testing: Zero questions about "what does this number mean?"**

**RSU-Specific Launch Criteria:**
- [ ] **Forfeiture calculations accurate:**
  - Test case: Reproduce Example 5.2 exactly (150 shares forfeited)
  - Test case: Retirement before all grants = 100% unvested forfeited
  - Test case: Retirement after all grants = 0% forfeited
- [ ] **Forfeiture warnings display correctly:**
  - Warning appears when forfeiture > 10% of total grant value
  - Warning shows dollar amount of loss
  - Warning suggests alternative retirement dates
- [ ] **Tax calculations verified:**
  - Section 102 (2+ years): Marginal + capital gains tax
  - Non-102 (<2 years): Marginal + income + capital gains tax
  - 3% surtax applied correctly when enabled
  - MIN(grant price, sale price) logic for marginal tax
- [ ] **Edge cases handled:**
  - Retirement on grant date = all shares forfeited
  - Grant date after retirement = grant ignored with warning
  - Stock price = $0 = validation error prevents save
  - Negative stock returns = calculations still work
- [ ] **Vesting schedule accuracy:**
  - 1-year cliff: 0 shares vest before 12 months
  - After cliff: 25% vest per year (linear interpolation)
  - Fully vested after 4 years

### 9.2 Post-Launch Metrics (3 months)

#### 9.2.1 Business Metrics (PRIMARY)
- **Adoption Rate:** 
  - Target: 40%+ of active users add ≥1 RSU grant
  - Measure: Track "Add Grant" button clicks & successful saves
  - Dashboard: Weekly cohort analysis

- **Engagement Depth:**
  - Target: RSU users run 2x more calculations than non-RSU users
  - Target: Average 3+ grants per RSU user
  - Measure: Calculation frequency, grant count distribution

- **User Satisfaction:**
  - Target: NPS ≥ 8 from RSU users
  - Target: < 2% negative feedback on RSU feature
  - Measure: In-app survey after 3 calculations

- **Retention:**
  - Target: 60%+ of RSU users return within 30 days
  - Target: 80%+ of RSU users return before tax season
  - Measure: Return visitor rate (cookie-based)

- **Accuracy Perception:**
  - Target: < 5 support tickets per 100 RSU users
  - Target: < 3% of users report calculation errors
  - Measure: Support ticket tagging, error report form

#### 9.2.2 Technical Metrics (SECONDARY)
- **Performance:** 
  - Target: < 1 second 95th percentile
  - Measure: Chrome User Experience Report (CrUX)

- **Reliability:**
  - Target: < 0.1% calculation errors (exception rate)
  - Target: 99.9% API uptime (Finnhub availability)
  - Measure: Error logging, API monitoring

- **Test Coverage:**
  - Target: 80%+ line coverage for RSU code
  - Target: 100% coverage for tax calculation functions
  - Measure: Coverage reports in CI/CD

#### 9.2.3 Validation Metrics (QUALITY)
- **Accountant Review:**
  - Approach: Partner with 3 Israeli CPAs
  - Test: 10 realistic scenarios, compare results
  - Target: < 5% variance from CPA hand calculations
  - Frequency: Quarterly re-validation

- **Community Feedback:**
  - Implement: "Report Issue" button on calculations
  - Track: User-reported errors vs. confirmed bugs
  - Target: < 1% confirmed error rate

### 9.3 Future Enhancements (Phase 2)
- [ ] Strategy 2 (Sell at Retirement) implementation
- [ ] Strategy Comparison Tool - side-by-side comparison modal
- [ ] Support for ESPP (Employee Stock Purchase Plans)
- [ ] Custom vesting schedules (non-linear)
- [ ] What-if analysis: Compare multiple strategies side-by-side
- [ ] Export to Excel/PDF report
- [ ] Integration with brokerage accounts (auto-import grants)
- [ ] Section 102 "income track" support
- [ ] Multi-company RSU management (multiple stock symbols)
- [ ] Historical price charts for granted stocks
- [ ] Tax loss harvesting recommendations
- [ ] Save/load plan with RSU configuration

---

## 10. Timeline & Milestones

### Phase 1: MVP Foundation (Weeks 1-3)
- **Weeks 1-2:**
  - [ ] Data models (RsuModels.cs) - Strategy 1 only
  - [ ] Core calculation service (RsuCalculator.cs)
  - [ ] Unit tests for vesting logic
- **Week 3:**
  - [ ] Integration with FireCalculator
  - [ ] API endpoint updates
  - [ ] Integration tests

### Phase 2: MVP UI (Weeks 4-5)
- **Week 4:**
  - [ ] RSU tab HTML/CSS
  - [ ] Grant management table
  - [ ] Add/edit/delete modals
- **Week 5:**
  - [ ] Summary infographics
  - [ ] Form validation
  - [ ] Responsive design

### Phase 3: MVP Visualization (Week 6)
- **Week 6:**
  - [ ] 1 RSU chart - Value over time (Chart.js)
  - [ ] Update main results charts
  - [ ] Frontend tests

### Phase 4: Polish & Testing (Weeks 7-8)
- **Weeks 7-8:**
  - [ ] End-to-end testing
  - [ ] Performance optimization
  - [ ] Hebrew translations review
  - [ ] Documentation
  - [ ] Bug fixes

### Phase 5: MVP Launch (Week 9)
- **Week 9:**
  - [ ] Code review
  - [ ] Staging deployment
  - [ ] User acceptance testing
  - [ ] Production deployment
  - [ ] Monitoring & hotfixes

### Phase 6: Enhanced Features (Weeks 10-13)
- **Weeks 10-11:**
  - [ ] Strategy 2 implementation
  - [ ] Additional vesting types
  - [ ] 2 additional charts

- **Weeks 12-13:**
  - [ ] Comprehensive tooltip system
  - [ ] Save/load integration
  - [ ] Currency support (ILS)
  - [ ] Testing and deployment

**Total Estimated Effort:** 
- Phase 1 (MVP): 9 weeks
- Phase 2 (Enhanced): 4 weeks
- **Total: 13 weeks (1 full-time developer)**

---

## 11. Open Questions & Decisions Needed

### 11.1 Technical Decisions
1. ~~**Stock Price Projection:** How to project future stock prices?~~
   - ~~Option A: Use historical CAGR from portfolio~~
   - ~~Option B: User-specified growth rate per stock~~
   - ~~Option C: Pessimistic/realistic/optimistic scenarios~~
   - **DECIDED:** Option B - User specifies expected annual return and method (CAGR/Fixed), similar to portfolio asset configuration

2. **Vesting Precision:** Quarterly vs. monthly vs. daily?
   - **DECIDED:** Monthly precision for calculations, support multiple vesting schedules including Standard (1-year cliff + 25% yearly)

3. **Tax Complexity:** Model income tax brackets or use flat rate?
   - **DECIDED:** Configurable income tax rate (default 47% top bracket)

### 11.2 Product Decisions
1. **Multi-Company Support:** Allow grants from multiple companies in v1?
   - **Recommendation:** No - single company/symbol for MVP, Phase 2 enhancement

2. **Historical Data:** Import past vesting/sales?
   - **Recommendation:** No - focus on forward-looking projections only

3. **Advanced Vesting:** Support cliff, backloaded, or custom schedules?
   - **DECIDED:** Yes - VestingScheduleType enum with Standard (1-year cliff, default), Quarterly, Yearly, Cliff, and Custom options

4. **Strategy Visibility:** Show both strategies' results simultaneously?
   - **Recommendation:** No - one strategy at a time, but easy to switch

### 11.3 Pending Research
- [ ] Verify Section 102 "2-year rule" exact date calculation (grant date vs. allocation date)
- [ ] Confirm capital gains tax rate for 2025 (currently 25%)
- [ ] Check if currency conversion affects tax calculations
- [ ] Research RSU taxation for dual US-IL citizens (out of scope for MVP)

---

## 12. Appendices

### 12.1 Glossary
- **RSU:** Restricted Stock Unit - equity compensation granted by employer
- **Vesting:** The process by which RSUs become owned by the employee
- **Section 102:** Israeli tax law providing capital gains tax benefit for stock held 2+ years
- **Grant Date:** Date when RSUs are awarded (not yet vested)
- **Vest Date:** Date when shares become owned (can be sold)
- **FIRE:** Financial Independence, Retire Early
- **102 Capital Track:** Section 102 option where gains are taxed as capital gains (typically 25%)
- **102 Income Track:** Alternative where initial gains are taxed as income (not implemented)
- **3% Surtax:** Additional tax on capital gains for high-income earners (annual income > ₪721,560 as of 2024)
- **Marginal Tax Rate:** User's highest income tax bracket rate (used for RSU grant value taxation)
- **Capital Gains Tax:** Tax rate on investment profits (configurable in plan settings, typically 25%)

### 12.4 Example Calculation Breakdown (For Tooltips)

**Scenario:** 250 shares sold at $133, granted at $100, marginal rate 47%, capital gains 28% (25% + 3% surtax)

**Step-by-Step Calculation (shown in tooltip/modal):**
```
1️⃣ Marginal Tax on Grant Value:
   Base Amount = MIN(Grant Price, Sale Price) × Shares
               = MIN($100, $133) × 250
               = $100 × 250 = $25,000
   
   Marginal Tax = Base Amount × Marginal Rate
                = $25,000 × 47%
                = $11,750
   
   💡 Why MIN? If stock drops below grant price, you only pay tax on lower value

2️⃣ Capital Gains Tax:
   Capital Gain = (Sale Price - Grant Price) × Shares
                = ($133 - $100) × 250
                = $33 × 250 = $8,250
   
   Capital Gains Tax = Capital Gain × (Base Rate + Surtax)
                     = $8,250 × (25% + 3%)
                     = $8,250 × 28%
                     = $2,310
   
   💡 3% surtax applies because annual income > ₪721,560

3️⃣ Total Tax:
   Total Tax = Marginal Tax + Capital Gains Tax
             = $11,750 + $2,310
             = $14,060

4️⃣ Net Proceeds:
   Gross Sale = Sale Price × Shares
              = $133 × 250 = $33,250
   
   Net Proceeds = Gross Sale - Total Tax
                = $33,250 - $14,060
                = $19,190
   
   💰 Effective Tax Rate = $14,060 / $33,250 = 42.3%
```

**This breakdown appears when user:**
- Hovers over "מס ששולם" column in timeline table
- Clicks ⓘ icon on tax bar in chart
- Expands yearly transaction details

### 12.2 References
- [Israeli Tax Authority - Section 102 Guide](https://www.gov.il/he/departments/guides/salary-102) (Hebrew)
- [Capital Gains Tax in Israel](https://www.gov.il/en/departments/general/capital_gains_tax)
- [Finnhub API Documentation](https://finnhub.io/docs/api)
- [Chart.js Documentation](https://www.chartjs.org/docs/latest/)

### 12.3 Sample Screenshots (To Be Created)
1. RSU Tab Overview (empty state)
2. RSU Tab with 3 grants
3. Add Grant Modal
4. Results Tab with RSU charts
5. Mobile view of RSU tab

---

## 13. Approval & Sign-Off

### 13.1 Stakeholders
- **Product Owner:** [Name] - Approved: [ ]
- **Engineering Lead:** [Name] - Approved: [ ]
- **UX Designer:** [Name] - Approved: [ ]
- **QA Lead:** [Name] - Approved: [ ]
- **Tax Advisor:** [Name] - Approved: [ ] *(Optional but recommended)*

### 13.2 Version History
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-21 | AI/Product Team | Initial draft |
| 2.0 | 2025-12-03 | AI/Product Team | PM Review revisions: Reduced MVP scope (Strategy 1 only, 1 chart), added Security & Privacy section, clarified portfolio integration logic, expanded success metrics with business KPIs, added forfeiture testing to launch criteria, clarified currency conversion, added error recovery specs, enhanced mobile UX specifications, added competitive landscape analysis, improved tooltip strategy with progressive disclosure, updated timeline from 7 to 13 weeks |

---

**End of PRD**

*This document is a living document and will be updated as requirements evolve during implementation.*
