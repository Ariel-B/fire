# Product Requirements Document: Data Visualization & Charts

**Version:** 1.0  
**Last Updated:** November 2025  
**Owner:** Product Team  
**Status:** Reverse-Engineered from Implementation  
**Parent PRD:** PRD_FIRE_PLANNING_TOOL.md

---

## Table of Contents

1. [Overview](#1-overview)
2. [Chart Library & Technology](#2-chart-library--technology)
3. [Donut Charts - Portfolio Composition](#3-donut-charts---portfolio-composition)
4. [Line Charts - Growth Projections](#4-line-charts---growth-projections)
5. [Bar Charts - Expense Timeline](#5-bar-charts---expense-timeline)
6. [Summary Cards](#6-summary-cards)
7. [UI Layout & Placement](#7-ui-layout--placement)
8. [Interactivity & Tooltips](#8-interactivity--tooltips)
9. [Color Palette & Styling](#9-color-palette--styling)
10. [Future Enhancements](#10-future-enhancements)

---

## 1. Overview

### 1.1 Purpose

The Data Visualization module provides users with intuitive, interactive visual representations of their FIRE planning data. Visualizations help users understand:

- Portfolio composition and allocation
- Growth trajectory over time
- Expense impact on retirement timeline
- Key financial metrics at a glance

### 1.2 Visualization Types

| Type | Purpose | Location |
|------|---------|----------|
| Donut Charts | Portfolio composition by asset | Accumulation Tab, Results Tab |
| Line Chart | Portfolio growth over time | Results Tab |
| Bar Chart | Expenses by year | Expenses Tab, Results Tab |
| Summary Cards | Key metrics display | Results Tab, Portfolio Summaries |

### 1.3 Design Principles

1. **Clarity**: Data should be immediately understandable
2. **Consistency**: Same colors/styles across all charts
3. **Interactivity**: Tooltips and hover states for details
4. **RTL Support**: Hebrew labels, right-to-left orientation
5. **Responsiveness**: Adapt to different screen sizes

---

## 2. Chart Library & Technology

### 2.1 Chart.js

**Version:** 4.x (via CDN)

**CDN Import:**
```html
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
```

### 2.2 Why Chart.js?

| Advantage | Description |
|-----------|-------------|
| Lightweight | ~60KB minified |
| No build step | Works directly in browser |
| Responsive | Built-in responsive design |
| Animations | Smooth transitions |
| Customizable | Extensive options API |
| Well-documented | Large community |

### 2.3 Configuration Approach

Charts are configured via JavaScript objects:

```javascript
const chart = new Chart(ctx, {
    type: 'doughnut',
    data: { ... },
    options: { ... }
});
```

---

## 3. Donut Charts - Portfolio Composition

### 3.1 Chart Instances

| Chart ID | Location | Data Source |
|----------|----------|-------------|
| accumulationStartChart | Accumulation Tab | Current portfolio |
| accumulationEndChart | Accumulation Tab | Projected at retirement |
| startAccumulationChart | Results Tab | Same as accumulationStartChart |
| startRetirementChart | Results Tab | Portfolio at retirement |
| endRetirementChart | Results Tab | Portfolio at end of life |
| retirementPortfolioChart | Retirement Tab | Retirement allocation |

### 3.2 Data Structure

```javascript
{
    labels: ['VOO', 'VTI', 'AAPL', 'Other'],  // Asset symbols
    datasets: [{
        data: [45000, 22000, 15000, 8000],    // Values in display currency
        backgroundColor: [
            '#3b82f6',  // Blue
            '#22c55e',  // Green
            '#f59e0b',  // Amber
            '#ef4444',  // Red
            // ... more colors
        ],
        borderWidth: 0
    }]
}
```

### 3.3 Configuration Options

```javascript
{
    type: 'doughnut',
    options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',  // Donut hole size
        plugins: {
            legend: {
                display: true,
                position: 'bottom',
                rtl: true,
                labels: {
                    font: { family: "'Segoe UI', sans-serif" },
                    boxWidth: 15
                }
            },
            tooltip: {
                rtl: true,
                callbacks: {
                    label: function(context) {
                        const value = context.raw;
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = ((value / total) * 100).toFixed(1);
                        return `${context.label}: ${formatCurrency(value)} (${percentage}%)`;
                    }
                }
            }
        }
    }
}
```

### 3.4 Container Styling

```css
.donut-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-height: 280px;
}

.chart-wrapper {
    position: relative;
    width: 200px;
    height: 200px;
    margin: 0 auto;
}

.donut-chart {
    position: absolute;
    top: 0;
    left: 0;
    width: 100% !important;
    height: 100% !important;
}
```

### 3.5 Value Display

Below each donut chart:

```html
<div id="accumulationStartValue" class="text-lg font-bold mt-2 text-blue-600 text-center">
    ₪125,000
</div>
<div id="accumulationStartUnrealizedGain" class="text-xs text-center text-green-600">
    רווח לא ממומש: ₪25,000
</div>
```

---

## 4. Line Charts - Growth Projections

### 4.1 Main Growth Chart

**Location:** Results Tab  
**Chart ID:** mainChart

**Purpose:** Show portfolio value over entire timeline (accumulation + retirement)

### 4.2 Data Structure

```javascript
{
    labels: [2024, 2025, 2026, ..., 2070],  // Years
    datasets: [
        {
            label: 'שווי תיק',
            data: [100000, 175000, 265000, ...],  // Portfolio values
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
            tension: 0.4
        },
        {
            label: 'הפקדות מצטברות',
            data: [100000, 160000, 220000, ...],  // Cumulative contributions
            borderColor: '#22c55e',
            backgroundColor: 'transparent',
            borderDash: [5, 5],
            fill: false,
            tension: 0.4
        }
    ]
}
```

### 4.3 Configuration Options

```javascript
{
    type: 'line',
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'top',
                rtl: true,
                labels: {
                    font: { family: "'Segoe UI', sans-serif", size: 12 }
                }
            },
            tooltip: {
                rtl: true,
                mode: 'index',
                intersect: false,
                callbacks: {
                    title: function(items) {
                        return `שנת ${items[0].label}`;
                    },
                    label: function(context) {
                        return `${context.dataset.label}: ${formatCurrency(context.raw)}`;
                    }
                }
            }
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: 'שנה',
                    font: { family: "'Segoe UI', sans-serif" }
                },
                grid: { display: false }
            },
            y: {
                title: {
                    display: true,
                    text: 'שווי (₪)',
                    font: { family: "'Segoe UI', sans-serif" }
                },
                ticks: {
                    callback: function(value) {
                        return formatCompactNumber(value);
                    }
                }
            }
        },
        interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
        }
    }
}
```

### 4.4 Phase Indication

The chart visually distinguishes accumulation and retirement phases:

- **Accumulation Phase**: Blue-tinted background fill
- **Retirement Phase**: Orange-tinted background fill
- **Transition Point**: Vertical annotation line at retirement year

### 4.5 Container Styling

```css
.main-chart-wrapper {
    position: relative;
    height: 400px;
    width: 100%;
    margin: 0 auto;
}

.main-chart {
    position: absolute !important;
    top: 0;
    left: 0;
    width: 100% !important;
    height: 100% !important;
}
```

---

## 5. Bar Charts - Expense Timeline

### 5.1 Expense Charts

**Locations:** 
- Expenses Tab (expensesChart)
- Results Tab (resultsExpensesChart)

**Purpose:** Visualize planned expenses across years

### 5.2 Data Structure

```javascript
{
    labels: [2025, 2028, 2030, 2035, ...],  // Years with expenses
    datasets: [{
        label: 'הוצאות מתוכננות',
        data: [50000, 150000, 500000, 75000, ...],  // Expense amounts
        backgroundColor: '#ef4444',  // Red
        borderColor: '#dc2626',
        borderWidth: 1
    }]
}
```

### 5.3 Configuration Options

```javascript
{
    type: 'bar',
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false  // Single dataset, no legend needed
            },
            tooltip: {
                rtl: true,
                callbacks: {
                    title: function(items) {
                        return `שנת ${items[0].label}`;
                    },
                    label: function(context) {
                        const expense = getExpenseByYear(context.label);
                        return [
                            `${expense.type}: ${formatCurrency(context.raw)}`,
                            `(מתואם לאינפלציה)`
                        ];
                    }
                }
            }
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: 'שנה'
                },
                grid: { display: false }
            },
            y: {
                title: {
                    display: true,
                    text: 'סכום (₪)'
                },
                beginAtZero: true,
                ticks: {
                    callback: formatCompactNumber
                }
            }
        }
    }
}
```

### 5.4 Stacked Bar Option

For multiple expense types:

```javascript
{
    datasets: [
        {
            label: 'רכישת דירה',
            data: [0, 0, 500000, 0, ...],
            backgroundColor: '#ef4444',
            stack: 'expenses'
        },
        {
            label: 'החלפת רכב',
            data: [150000, 0, 0, 150000, ...],
            backgroundColor: '#f59e0b',
            stack: 'expenses'
        }
    ],
    options: {
        scales: {
            x: { stacked: true },
            y: { stacked: true }
        }
    }
}
```

---

## 6. Summary Cards

### 6.1 Results Summary Cards

**Location:** Top of Results Tab

```
┌────────────────┬────────────────┬────────────────┐
│  סה"כ הפקדות   │  משיכה שנתית   │  הוצאה חודשית  │
│  (עד פרישה)    │                │                │
│                │                │                │
│   ₪1,200,000   │   ₪120,000     │   ₪8,500       │
│                │   (ברוטו: ...)  │   (ברוטו: ...) │
└────────────────┴────────────────┴────────────────┘
```

### 6.2 Card HTML Structure

```html
<div class="bg-gray-50 p-4 rounded-lg shadow text-center">
    <h3 class="text-sm font-medium text-gray-600 mb-2">סה"כ הפקדות (עד פרישה)</h3>
    <div id="totalContributions" class="text-2xl font-bold text-blue-600">₪0</div>
    <div id="contributionsBreakdown" class="text-xs text-gray-500 mt-1">
        קרן: ₪X + הפקדות: ₪Y
    </div>
</div>
```

### 6.3 Portfolio Summary Cards

**Location:** Accumulation Tab, Portfolio Overview

```
┌─────────────────────────────────────┐
│  📋 סיכום התיק                      │
│  ─────────────────                  │
│  מספר נכסים: 5                      │
│  שווי כולל: ₪450,000                │
│  בסיס עלות: ₪380,000                │
│  רווח/הפסד: ₪70,000 (+18.4%)        │
└─────────────────────────────────────┘
```

### 6.4 Card Color Coding

| Metric | Positive Color | Negative Color | Neutral Color |
|--------|----------------|----------------|---------------|
| Portfolio Value | Blue (#3b82f6) | - | - |
| Gain/Loss | Green (#22c55e) | Red (#ef4444) | Gray (#6b7280) |
| Withdrawal | Green (#22c55e) | - | - |
| Expenses | Purple (#a855f7) | - | - |

---

## 7. UI Layout & Placement

### 7.1 Accumulation Tab Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  📊 סקירת תיק הצבירה                                            │
├─────────────────────────────────────────┬────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐       │  📋 סיכום התיק         │
│  │   Donut 1   │  │   Donut 2   │       │  ─────────────         │
│  │   (Start)   │  │   (End)     │       │  מספר נכסים: X        │
│  └─────────────┘  └─────────────┘       │  שווי כולל: ₪X        │
│       ₪X              ₪Y                │  בסיס עלות: ₪X        │
│                                         │  רווח/הפסד: ₪X        │
├─────────────────────────────────────────┴────────────────────────┤
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    PORTFOLIO TABLE                          │  │
│  │  Asset | Qty | Price | Cost | Value | Gain | Exp% | Method │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  [➕ הוסף נכס חדש]                                              │
└──────────────────────────────────────────────────────────────────┘
```

### 7.2 Results Tab Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                  │
│  │  Card 1    │  │  Card 2    │  │  Card 3    │                  │
│  │ הפקדות     │  │ משיכה שנתית│  │ חודשי     │                   │
│  └────────────┘  └────────────┘  └────────────┘                  │
├──────────────────────────────────────────────────────────────────┤
│  התפלגות תיק לפי תקופות                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                        │
│  │ Donut 1  │  │ Donut 2  │  │ Donut 3  │                        │
│  │ Start    │  │ Retire   │  │ End      │                        │
│  └──────────┘  └──────────┘  └──────────┘                        │
├──────────────────────────────────────────────────────────────────┤
│  גרף צמיחה ומשיכות                                              │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                                                            │  │
│  │                    LINE CHART                              │  │
│  │                                                            │  │
│  └────────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────────┤
│  הוצאות מתוכננות לפי שנים                                       │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    BAR CHART                               │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### 7.3 Expenses Tab Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  התפלגות הוצאות מתוכננות לפי שנים                               │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    BAR CHART                               │  │
│  └────────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                   EXPENSE TABLE                            │  │
│  │  Type | Amount | Year | Freq | Reps | Adjusted | Total    │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  [➕ הוסף הוצאה חדשה]                                           │
└──────────────────────────────────────────────────────────────────┘
```

---

## 8. Interactivity & Tooltips

### 8.1 Hover Tooltips

All charts display tooltips on hover:

```javascript
tooltip: {
    enabled: true,
    rtl: true,
    titleFont: { family: "'Segoe UI', sans-serif", size: 14 },
    bodyFont: { family: "'Segoe UI', sans-serif", size: 12 },
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 12,
    cornerRadius: 4,
    displayColors: true
}
```

### 8.2 Legend Interaction

- Click legend item to hide/show dataset
- Hover legend item to highlight dataset

### 8.3 Chart Animations

```javascript
animation: {
    duration: 500,
    easing: 'easeOutQuart'
}
```

### 8.4 Real-Time Updates

Charts update automatically when:
- Input values change
- Portfolio assets are added/removed
- Expenses are modified
- Currency is switched

```javascript
function updateCharts(result) {
    // Update donut charts
    updateDonutChart('accumulationStartChart', getPortfolioChartData());
    
    // Update line chart
    mainChart.data = getGrowthChartData(result.yearlyData);
    mainChart.update();
    
    // Update bar chart
    updateExpensesChart(result.yearlyData);
}
```

---

## 9. Color Palette & Styling

### 9.1 Chart Colors

```javascript
const chartColors = {
    // Primary palette for data series
    series: [
        '#3b82f6',  // Blue 500
        '#22c55e',  // Green 500
        '#f59e0b',  // Amber 500
        '#ef4444',  // Red 500
        '#8b5cf6',  // Violet 500
        '#ec4899',  // Pink 500
        '#14b8a6',  // Teal 500
        '#f97316',  // Orange 500
        '#6366f1',  // Indigo 500
        '#84cc16',  // Lime 500
    ],
    
    // Semantic colors
    positive: '#22c55e',  // Green
    negative: '#ef4444',  // Red
    neutral: '#6b7280',   // Gray
    
    // Phase colors
    accumulation: 'rgba(59, 130, 246, 0.1)',   // Light blue
    retirement: 'rgba(249, 115, 22, 0.1)',     // Light orange
    
    // Background
    gridLines: '#e5e7eb',
    chartBackground: '#f9fafb'
};
```

### 9.2 Typography

```javascript
const chartTypography = {
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    title: { size: 16, weight: 'bold' },
    label: { size: 12, weight: 'normal' },
    tick: { size: 11, weight: 'normal' },
    tooltip: { size: 12, weight: 'normal' }
};
```

### 9.3 RTL Considerations

- Legend position: 'bottom' or 'right' (adapts to RTL)
- Tooltip alignment: Right-aligned for Hebrew
- Scale labels: Hebrew text properly rendered
- Axis labels: Positioned correctly for RTL

---

## 10. Future Enhancements

### 10.1 Planned Chart Enhancements

| Feature | Priority | Description |
|---------|----------|-------------|
| Zoom & Pan | Medium | Allow zooming into specific time periods |
| Export as PNG | Medium | Download charts as images |
| Print optimization | Low | Print-friendly chart versions |
| Dark mode | Low | Dark theme support |
| Custom time range | Medium | Select specific date range |

### 10.2 New Chart Types

| Chart Type | Purpose | Priority |
|------------|---------|----------|
| Area chart | Stacked portfolio growth | Medium |
| Waterfall | Contribution breakdown | Low |
| Scatter plot | Risk vs Return | Low |
| Gauge chart | Goal progress | Medium |
| Sankey Diagram | Cash flow visualization | Low |

### 10.3 Advanced Visualizations

| Feature | Description |
|---------|-------------|
| Monte Carlo bands | Show probability ranges |
| Scenario comparison | Multiple scenarios side-by-side |
| What-if sliders | Interactive parameter adjustment |
| Milestone markers | Annotate key life events |

---

## Appendix A: Number Formatting

### A.1 Currency Formatting

```javascript
function formatCurrency(value, currency = '₪') {
    const absValue = Math.abs(value);
    const formatted = new Intl.NumberFormat('he-IL', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(absValue);
    
    const sign = value < 0 ? '-' : '';
    return `${sign}${currency}${formatted}`;
}
```

### A.2 Compact Number Formatting

```javascript
function formatCompactNumber(value) {
    if (Math.abs(value) >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`;
    } else if (Math.abs(value) >= 1000) {
        return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toString();
}
```

### A.3 Percentage Formatting

```javascript
function formatPercentage(value, decimals = 1) {
    return `${value.toFixed(decimals)}%`;
}
```

---

## Appendix B: Chart.js Plugins Used

### B.1 Built-in Plugins

| Plugin | Purpose |
|--------|---------|
| Legend | Display dataset labels |
| Tooltip | Hover information |
| Title | Chart titles |
| Filler | Area chart fills |

### B.2 Custom Callbacks

```javascript
// Custom tooltip label
callbacks: {
    label: function(context) {
        const value = context.raw;
        const label = context.dataset.label || context.label;
        return `${label}: ${formatCurrency(value)}`;
    }
}

// Custom tick formatting
ticks: {
    callback: function(value) {
        return formatCompactNumber(value);
    }
}
```

---

## Appendix C: Responsive Breakpoints

| Breakpoint | Chart Height | Legend Position | Font Size |
|------------|--------------|-----------------|-----------|
| Mobile (<768px) | 250px | Bottom | 10px |
| Tablet (768-1024px) | 350px | Bottom | 11px |
| Desktop (>1024px) | 400px | Right | 12px |

```javascript
const responsiveOptions = {
    responsive: true,
    maintainAspectRatio: false,
    onResize: function(chart, size) {
        // Adjust font sizes based on width
        const fontSize = size.width < 768 ? 10 : size.width < 1024 ? 11 : 12;
        chart.options.plugins.legend.labels.font.size = fontSize;
    }
};
```

---

**End of Document**

*This PRD documents the data visualization and charting features implemented in the FIRE Planning Tool.*
