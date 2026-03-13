# LOC Report

Generated: 2026-03-11  
**Grand Total: 433 files · 122,426 LOC**

> Excludes: `node_modules/`, `bin/`, `obj/`, `artifacts/`, compiled JS (`wwwroot/js/`), third-party (`wwwroot/vendor/`), and lockfiles.

## Summary

| | Files | LOC | Share |
|--|------:|----:|------:|
| Tests | 147 | 44,522 | 36.4% |
| AI Agent Primitives | 116 | 33,483 | 27.3% |
| Source Code | 87 | 25,405 | 20.8% |
| Documentation | 52 | 16,518 | 13.5% |
| Tools | 10 | 1,524 | 1.2% |
| Config | 21 | 974 | 0.8% |

**Test : Code ratio:** `1.75x` (44,522 / 25,405)

## Distribution by Category

<div style="background-color: #ffffff; padding: 1em; border-radius: 8px;">

```mermaid
%%{init: {"theme": "base", "themeVariables": {'pie1': '#E54C4C', 'pie2': '#E5E54C', 'pie3': '#4CE54C', 'pie4': '#4CE5E5', 'pie5': '#4C4CE5', 'pie6': '#E54CE5', 'background': '#ffffff', 'mainBkg': '#ffffff', 'pieTitleTextColor': '#1f2937', 'pieLegendTextColor': '#374151', 'pieSectionTextColor': '#1f2937', 'pieStrokeColor': '#e5e7eb', 'pieStrokeWidth': '2px', 'pieOuterStrokeColor': '#ffffff', 'pieOuterStrokeWidth': '0px', 'pieOpacity': '1'}}}%%
pie title LOC by Category
    "Tests" : 44522
    "AI Agent Primitives" : 33483
    "Source Code" : 25405
    "Documentation" : 16518
    "Tools" : 1524
    "Config" : 974
```

</div>

---

## Tests — 147 files · 44,522 LOC

| | Files | LOC | Share |
|--|------:|----:|------:|
| Jest (wwwroot/tests/) | 59 | 23,946 | 53.8% |
| C# xUnit (tests/backend/) | 63 | 19,117 | 42.9% |
| Playwright E2E (tests/e2e/) | 25 | 1,459 | 3.3% |

<div style="background-color: #ffffff; padding: 1em; border-radius: 8px;">

```mermaid
%%{init: {"theme": "base", "themeVariables": {'pie1': '#E54C4C', 'pie2': '#4CE54C', 'pie3': '#4C4CE5', 'background': '#ffffff', 'mainBkg': '#ffffff', 'pieTitleTextColor': '#1f2937', 'pieLegendTextColor': '#374151', 'pieSectionTextColor': '#1f2937', 'pieStrokeColor': '#e5e7eb', 'pieStrokeWidth': '2px', 'pieOuterStrokeColor': '#ffffff', 'pieOuterStrokeWidth': '0px', 'pieOpacity': '1'}}}%%
pie title Tests — LOC breakdown
    "Jest (wwwroot/tests/)" : 23946
    "C# xUnit (tests/backend/)" : 19117
    "Playwright E2E (tests/e2e/)" : 1459
```

</div>

---

## AI Agent Primitives — 116 files · 33,483 LOC

| | Files | LOC | Share |
|--|------:|----:|------:|
| Skills (.agents/) | 92 | 28,000 | 83.6% |
| Agent definitions (.github/agents/) | 21 | 4,775 | 14.3% |
| Instructions & lockfile | 3 | 708 | 2.1% |

<div style="background-color: #ffffff; padding: 1em; border-radius: 8px;">

```mermaid
%%{init: {"theme": "base", "themeVariables": {'pie1': '#E54C4C', 'pie2': '#4CE54C', 'pie3': '#4C4CE5', 'background': '#ffffff', 'mainBkg': '#ffffff', 'pieTitleTextColor': '#1f2937', 'pieLegendTextColor': '#374151', 'pieSectionTextColor': '#1f2937', 'pieStrokeColor': '#e5e7eb', 'pieStrokeWidth': '2px', 'pieOuterStrokeColor': '#ffffff', 'pieOuterStrokeWidth': '0px', 'pieOpacity': '1'}}}%%
pie title AI Agent Primitives — LOC breakdown
    "Skills (.agents/)" : 28000
    "Agent definitions (.github/agents/)" : 4775
    "Instructions & lockfile" : 708
```

</div>

---

## Source Code — 87 files · 25,405 LOC

| | Files | LOC | Share |
|--|------:|----:|------:|
| TypeScript (wwwroot/ts/) | 34 | 14,251 | 56.1% |
| C# backend (src/) | 47 | 9,039 | 35.6% |
| HTML | 3 | 1,743 | 6.9% |
| CSS | 3 | 372 | 1.5% |

<div style="background-color: #ffffff; padding: 1em; border-radius: 8px;">

```mermaid
%%{init: {"theme": "base", "themeVariables": {'pie1': '#E54C4C', 'pie2': '#99E54C', 'pie3': '#4CE5E5', 'pie4': '#984CE5', 'background': '#ffffff', 'mainBkg': '#ffffff', 'pieTitleTextColor': '#1f2937', 'pieLegendTextColor': '#374151', 'pieSectionTextColor': '#1f2937', 'pieStrokeColor': '#e5e7eb', 'pieStrokeWidth': '2px', 'pieOuterStrokeColor': '#ffffff', 'pieOuterStrokeWidth': '0px', 'pieOpacity': '1'}}}%%
pie title Source Code — LOC breakdown
    "TypeScript (wwwroot/ts/)" : 14251
    "C# backend (src/)" : 9039
    "HTML" : 1743
    "CSS" : 372
```

</div>

---

## Documentation — 52 files · 16,518 LOC

| | Files | LOC | Share |
|--|------:|----:|------:|
| docs/prd/ | 10 | 7,876 | 47.7% |
| docs/ADRs/ | 24 | 4,299 | 26.0% |
| docs/ (root files) | 11 | 2,405 | 14.6% |
| docs/architecture/ | 1 | 858 | 5.2% |
| Root .md files | 2 | 804 | 4.9% |
| docs/security/ | 2 | 254 | 1.5% |
| docs/reviews/ | 1 | 17 | 0.1% |
| docs/refactorings/ | 1 | 5 | 0.0% |

<div style="background-color: #ffffff; padding: 1em; border-radius: 8px;">

```mermaid
%%{init: {"theme": "base", "themeVariables": {'pie1': '#E54C4C', 'pie2': '#E5BF4C', 'pie3': '#99E54C', 'pie4': '#4CE572', 'pie5': '#4CE5E5', 'pie6': '#4C72E5', 'pie7': '#984CE5', 'pie8': '#E54CBF', 'background': '#ffffff', 'mainBkg': '#ffffff', 'pieTitleTextColor': '#1f2937', 'pieLegendTextColor': '#374151', 'pieSectionTextColor': '#1f2937', 'pieStrokeColor': '#e5e7eb', 'pieStrokeWidth': '2px', 'pieOuterStrokeColor': '#ffffff', 'pieOuterStrokeWidth': '0px', 'pieOpacity': '1'}}}%%
pie title Documentation — LOC breakdown
    "docs/prd/" : 7876
    "docs/ADRs/" : 4299
    "docs/ (root files)" : 2405
    "docs/architecture/" : 858
    "Root .md files" : 804
    "docs/security/" : 254
    "docs/reviews/" : 17
    "docs/refactorings/" : 5
```

</div>

---

## Tools — 10 files · 1,524 LOC

| | Files | LOC | Share |
|--|------:|----:|------:|
| tools/ scripts | 6 | 1,133 | 74.3% |
| CI workflows (.github/workflows/) | 2 | 274 | 18.0% |
| Makefile + setup.sh | 2 | 117 | 7.7% |

<div style="background-color: #ffffff; padding: 1em; border-radius: 8px;">

```mermaid
%%{init: {"theme": "base", "themeVariables": {'pie1': '#E54C4C', 'pie2': '#4CE54C', 'pie3': '#4C4CE5', 'background': '#ffffff', 'mainBkg': '#ffffff', 'pieTitleTextColor': '#1f2937', 'pieLegendTextColor': '#374151', 'pieSectionTextColor': '#1f2937', 'pieStrokeColor': '#e5e7eb', 'pieStrokeWidth': '2px', 'pieOuterStrokeColor': '#ffffff', 'pieOuterStrokeWidth': '0px', 'pieOpacity': '1'}}}%%
pie title Tools — LOC breakdown
    "tools/ scripts" : 1133
    "CI workflows (.github/workflows/)" : 274
    "Makefile + setup.sh" : 117
```

</div>

---

## Config — 21 files · 974 LOC

| | Files | LOC | Share |
|--|------:|----:|------:|
| JSON configs | 12 | 637 | 65.4% |
| YAML | 7 | 242 | 24.8% |
| .csproj | 2 | 95 | 9.8% |

<div style="background-color: #ffffff; padding: 1em; border-radius: 8px;">

```mermaid
%%{init: {"theme": "base", "themeVariables": {'pie1': '#E54C4C', 'pie2': '#4CE54C', 'pie3': '#4C4CE5', 'background': '#ffffff', 'mainBkg': '#ffffff', 'pieTitleTextColor': '#1f2937', 'pieLegendTextColor': '#374151', 'pieSectionTextColor': '#1f2937', 'pieStrokeColor': '#e5e7eb', 'pieStrokeWidth': '2px', 'pieOuterStrokeColor': '#ffffff', 'pieOuterStrokeWidth': '0px', 'pieOpacity': '1'}}}%%
pie title Config — LOC breakdown
    "JSON configs" : 637
    "YAML" : 242
    ".csproj" : 95
```

</div>
