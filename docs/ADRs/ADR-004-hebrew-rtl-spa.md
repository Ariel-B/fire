# ADR-004: Hebrew RTL Single-Page Application

**Status**: Accepted

**Date**: 2024-11

**Deciders**: Development Team, UX Team

**Technical Story**: User interface design for Hebrew-speaking users

## Context

The FIRE Planning Tool's target audience is Hebrew-speaking users in Israel, requiring:
- Right-to-Left (RTL) text direction
- Hebrew language interface
- Proper number formatting for Hebrew locale
- Currency symbols (₪ for ILS, $ for USD)
- Date formatting appropriate for Hebrew
- RTL-aware chart layouts
- Responsive design for mobile and desktop

Challenges:
- Most UI frameworks default to LTR
- Charts and visualizations need RTL adaptation
- Number formatting differs (thousands separator)
- Mixed Hebrew text with English numbers/symbols
- Browser RTL support varies

## Decision

Implement a **Single-Page Application (SPA)** with comprehensive Hebrew RTL support using:
- **HTML `dir="rtl"`** attribute on root element
- **Tailwind CSS** for RTL-aware styling
- **Chart.js** with RTL configuration
- **Hebrew text** throughout the interface
- **Bi-directional (BiDi) text handling** for mixed content

### Implementation:

```html
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>FIRE - כלי תכנון פרישה מוקדמת</title>
    <!-- Tailwind CSS with RTL support -->
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 text-gray-900">
    <!-- All text in Hebrew -->
    <h1 class="text-2xl font-bold">תכנון FIRE - פרישה מוקדמת</h1>
</body>
</html>
```

### Key Features:
- **RTL Layout**: All UI elements mirror for RTL
- **Hebrew Labels**: All text in Hebrew
- **Number Formatting**: Proper Hebrew number formatting
- **Currency Symbols**: ₪ and $ support
- **RTL Charts**: Chart.js configured for RTL direction
- **Responsive**: Works on mobile and desktop

## Consequences

### Positive
- **Native Experience**: Natural for Hebrew speakers
- **Professional Appearance**: Proper RTL implementation
- **Accessibility**: Follows browser RTL standards
- **Market Fit**: Tailored for Israeli market
- **Cultural Relevance**: Uses local terminology and conventions

### Negative
- **Testing Complexity**: Must test RTL-specific layouts
- **Browser Compatibility**: Some older browsers have RTL issues
- **Development Time**: Extra consideration for RTL
- **LTR Adaptation**: Harder to add LTR languages later

### Neutral
- **Niche Audience**: Focused on Hebrew market
- **Chart Adaptation**: Required custom Chart.js configuration

## Alternatives Considered

### Alternative 1: English-only Interface
**Description**: Build in English with no RTL

**Pros**:
- Simpler development
- No RTL complexity
- Wider potential audience

**Cons**:
- Poor user experience for Hebrew speakers
- Doesn't match target market
- Less professional for Israeli users

**Why not chosen**: Target audience is Hebrew-speaking Israelis.

### Alternative 2: LTR Hebrew
**Description**: Hebrew text in LTR layout

**Pros**:
- No RTL complexity
- Easier development

**Cons**:
- Unnatural reading experience
- Unprofessional appearance
- Poor usability
- Against user expectations

**Why not chosen**: Violates Hebrew language conventions.

### Alternative 3: Framework with RTL (Material-UI, etc.)
**Description**: Use UI framework with built-in RTL

**Pros**:
- RTL handled by framework
- Pre-built components

**Cons**:
- Framework overhead
- Less control over implementation
- Larger bundle size

**Why not chosen**: Adds unnecessary complexity. Native RTL is sufficient.

### Alternative 4: Separate RTL Stylesheet
**Description**: LTR default with RTL override stylesheet

**Pros**:
- Can support both directions

**Cons**:
- More complex CSS
- Maintenance burden
- Potential inconsistencies

**Why not chosen**: Only need RTL, not bi-directional support.

## Implementation Notes

HTML structure:

```html
<html lang="he" dir="rtl">
```

Tailwind CSS RTL classes work automatically:
```html
<!-- These automatically mirror in RTL -->
<div class="ml-4">  <!-- Becomes margin-right in RTL -->
<div class="text-left">  <!-- Becomes text-right in RTL -->
```

Chart.js RTL configuration:

```javascript
const chartConfig = {
    options: {
        indexAxis: 'x',
        plugins: {
            legend: {
                rtl: true,
                textDirection: 'rtl'
            }
        }
    }
};
```

Number formatting:

```javascript
function formatNumber(num) {
    return num.toLocaleString('he-IL', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}
```

Currency formatting:

```javascript
function formatCurrency(amount, currency) {
    const symbol = currency === 'ILS' ? '₪' : '$';
    const formatted = formatNumber(Math.round(amount));
    return `${symbol}${formatted}`;
}
```

Testing considerations:
- Test on multiple browsers (Chrome, Firefox, Safari, Edge)
- Test on mobile devices (iOS, Android)
- Verify chart rendering in RTL
- Check number and currency formatting
- Validate BiDi text handling (Hebrew + English/numbers)

## References

- [index.html](../../wwwroot/index.html)
- [RTL Best Practices](https://rtlstyling.com/)
- [Chart.js RTL](https://www.chartjs.org/docs/latest/configuration/internationalization.html)
- [Tailwind CSS RTL](https://tailwindcss.com/docs/rtl)
