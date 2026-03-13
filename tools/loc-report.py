#!/usr/bin/env python3
"""
LOC Report Generator
Counts lines of code per category and generates a Markdown report with Mermaid pie charts.

Usage:
    python3 tools/loc-report.py [--output PATH]

Default output: docs/LOC_REPORT.md
"""
import argparse
import colorsys
import sys
from collections import defaultdict
from datetime import date
from pathlib import Path

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

ROOT = Path(__file__).resolve().parent.parent

SKIP_DIRS = {"node_modules", ".git", "artifacts"}
SKIP_PATHS = {"wwwroot/js", "wwwroot/vendor", "bin", "obj"}
SKIP_BUILD_SEGMENTS = {"/bin/Debug/", "/bin/Release/", "/obj/Debug/", "/obj/Release/"}
LOCKFILES = {"package-lock.json", "project.assets.json"}

IMAGE_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp",
    ".ico", ".bmp", ".tiff", ".tif", ".avif",
}


# ---------------------------------------------------------------------------
# File classification
# ---------------------------------------------------------------------------

def should_skip(p: Path) -> bool:
    s = str(p)
    for seg in SKIP_BUILD_SEGMENTS:
        if seg in s:
            return True
    for part in p.relative_to(ROOT).parts:
        if part in SKIP_DIRS:
            return True
    rel = str(p.relative_to(ROOT))
    for sp in SKIP_PATHS:
        if rel.startswith(sp + "/") or rel == sp:
            return True
    if p.name in LOCKFILES:
        return True
    if p.suffix.lower() in IMAGE_EXTENSIONS:
        return True
    return False


def classify(p: Path) -> str | None:
    """Return the bucket name for a file, or None if unclassified/skipped."""
    if should_skip(p):
        return None
    rel = str(p.relative_to(ROOT))
    ext = p.suffix

    if rel.startswith("src/") and ext == ".cs":
        return "source_cs"
    if rel.startswith("wwwroot/ts/") and ext == ".ts":
        return "source_ts"
    if rel.startswith("wwwroot/") and ext == ".html" and rel.count("/") == 1:
        return "source_html"
    if rel.startswith("wwwroot/css/") and ext == ".css":
        return "source_css"

    if rel.startswith("tests/backend/") and ext == ".cs":
        return "test_cs"
    if rel.startswith("wwwroot/tests/") and ext in (".js", ".ts"):
        return "test_js"
    if rel.startswith("tests/e2e/") and ext == ".ts":
        return "test_e2e"

    if rel.startswith(".agents/"):
        return "ai_agents"
    if rel.startswith(".github/agents/"):
        return "ai_github_agents"
    if p.name in ("copilot-instructions.md", "CLAUDE.md", "skills-lock.json") or p.name.endswith(".instructions.md"):
        return "ai_instructions"

    if rel.startswith("tools/"):
        return "tools_scripts"
    if p.name in ("Makefile", "setup.sh"):
        return "tools_make"
    if rel.startswith(".github/workflows/"):
        return "tools_ci"

    if rel.startswith("docs/"):
        # Break docs/ into first-level subfolders
        parts = Path(rel[len("docs/"):]).parts
        sub = parts[0] if len(parts) > 1 else "(root)"
        return f"docs_{sub}"
    if ext == ".md" and "/" not in rel and p.name not in ("CLAUDE.md",):
        return "docs_(root md)"

    if ext == ".json":
        return "config_json"
    if ext in (".yml", ".yaml"):
        return "config_yaml"
    if ext == ".csproj":
        return "config_csproj"

    return None


def count_lines(p: Path) -> int:
    try:
        with open(p, errors="ignore") as f:
            return sum(1 for _ in f)
    except Exception:
        return 0


# ---------------------------------------------------------------------------
# Data collection
# ---------------------------------------------------------------------------

def collect() -> dict[str, tuple[int, int]]:
    """Returns {bucket: (file_count, loc)}"""
    buckets: dict[str, list[Path]] = defaultdict(list)
    for p in sorted(ROOT.rglob("*")):
        if not p.is_file():
            continue
        bucket = classify(p)
        if bucket:
            buckets[bucket].append(p)

    return {k: (len(v), sum(count_lines(f) for f in v)) for k, v in buckets.items()}


# ---------------------------------------------------------------------------
# Report structure
# ---------------------------------------------------------------------------

CATEGORIES = [
    {
        "name": "Source Code",
        "keys": ["source_cs", "source_ts", "source_html", "source_css"],
        "labels": {
            "source_cs":   "C# backend (src/)",
            "source_ts":   "TypeScript (wwwroot/ts/)",
            "source_html": "HTML",
            "source_css":  "CSS",
        },
    },
    {
        "name": "Tests",
        "keys": ["test_cs", "test_js", "test_e2e"],
        "labels": {
            "test_cs":  "C# xUnit (tests/backend/)",
            "test_js":  "Jest (wwwroot/tests/)",
            "test_e2e": "Playwright E2E (tests/e2e/)",
        },
    },
    {
        "name": "AI Agent Primitives",
        "keys": ["ai_agents", "ai_github_agents", "ai_instructions"],
        "labels": {
            "ai_agents":        "Skills (.agents/)",
            "ai_github_agents": "Agent definitions (.github/agents/)",
            "ai_instructions":  "Instructions & lockfile",
        },
    },
    {
        "name": "Tools",
        "keys": ["tools_scripts", "tools_make", "tools_ci"],
        "labels": {
            "tools_scripts": "tools/ scripts",
            "tools_make":    "Makefile + setup.sh",
            "tools_ci":      "CI workflows (.github/workflows/)",
        },
    },
    {
        "name": "Documentation",
        "keys": None,  # dynamic — populated from docs_* buckets
        "labels": {},
    },
    {
        "name": "Config",
        "keys": ["config_json", "config_yaml", "config_csproj"],
        "labels": {
            "config_json":   "JSON configs",
            "config_yaml":   "YAML",
            "config_csproj": ".csproj",
        },
    },
]

DOCS_SUBFOLDER_LABELS = {
    "(root)":       "docs/ (root files)",
    "(root md)":    "Root .md files",
    "ADRs":         "docs/ADRs/",
    "architecture": "docs/architecture/",
    "prd":          "docs/prd/",
    "reviews":      "docs/reviews/",
    "security":     "docs/security/",
    "images":       "docs/images/",
}


# ---------------------------------------------------------------------------
# Markdown generation helpers
# ---------------------------------------------------------------------------

def _generate_colors(n: int) -> list[str]:
    """Return n visually distinct colors evenly spaced around the HSL hue wheel.

    Uses high saturation and medium-high lightness so slices stand out clearly
    on the white chart background.
    """
    if n <= 0:
        return []
    colors = []
    for i in range(n):
        hue = i / n          # evenly spaced in [0, 1)
        r, g, b = colorsys.hls_to_rgb(hue, 0.60, 0.75)
        colors.append(f"#{int(r * 255):02X}{int(g * 255):02X}{int(b * 255):02X}")
    return colors


def mermaid_pie(title: str, slices: list[tuple[str, int]]) -> str:
    active_slices = [(label, value) for label, value in slices if value > 0]
    colors = _generate_colors(len(active_slices))
    color_vars = ", ".join(
        f"'pie{i+1}': '{c}'" for i, c in enumerate(colors)
    )
    theme_vars = (
        f"\"theme\": \"base\", "
        f"\"themeVariables\": {{{color_vars}, "
        f"'background': '#ffffff', "
        f"'mainBkg': '#ffffff', "
        f"'pieTitleTextColor': '#1f2937', "
        f"'pieLegendTextColor': '#374151', "
        f"'pieSectionTextColor': '#1f2937', "
        f"'pieStrokeColor': '#e5e7eb', "
        f"'pieStrokeWidth': '2px', "
        f"'pieOuterStrokeColor': '#ffffff', "
        f"'pieOuterStrokeWidth': '0px', "
        f"'pieOpacity': '1'}}"
    )
    init = f"%%{{init: {{{theme_vars}}}}}%%"
    # Wrap in an HTML div with white background so the transparent SVG
    # renders on white in both VS Code preview and GitHub.
    lines = [
        '<div style="background-color: #ffffff; padding: 1em; border-radius: 8px;">',
        '',
        '```mermaid', init, f'pie title {title}',
    ]
    for label, value in active_slices:
        lines.append(f'    "{label}" : {value}')
    lines.append('```')
    lines.append('')
    lines.append('</div>')
    return "\n".join(lines)


def table_rows(rows: list[tuple[str, int, int]]) -> str:
    lines = ["| | Files | LOC | Share |", "|--|------:|----:|------:|"]
    total_loc = sum(r[2] for r in rows)
    for label, files, loc in rows:
        pct = f"{loc/total_loc*100:.1f}%" if total_loc else "—"
        lines.append(f"| {label} | {files:,} | {loc:,} | {pct} |")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Report builder
# ---------------------------------------------------------------------------

def build_report(totals: dict[str, tuple[int, int]]) -> str:
    # Resolve dynamic docs keys (guard against mutating the module-level CATEGORIES on repeated calls)
    doc_keys = sorted(k for k in totals if k.startswith("docs_"))
    for cat in CATEGORIES:
        if cat["name"] == "Documentation":
            if cat["keys"] is None:
                cat["keys"] = doc_keys
            for k in doc_keys:
                sub = k[len("docs_"):]
                if k not in cat["labels"]:
                    cat["labels"][k] = DOCS_SUBFOLDER_LABELS.get(sub, f"docs/{sub}/")

    # Category totals
    cat_totals: list[tuple[str, int, int]] = []
    for cat in CATEGORIES:
        f = sum(totals.get(k, (0, 0))[0] for k in cat["keys"])
        l = sum(totals.get(k, (0, 0))[1] for k in cat["keys"])
        cat_totals.append((cat["name"], f, l))

    grand_files = sum(x[1] for x in cat_totals)
    grand_loc   = sum(x[2] for x in cat_totals)

    src_loc  = sum(totals.get(k, (0, 0))[1] for k in ["source_cs", "source_ts", "source_html", "source_css"])
    test_loc = sum(totals.get(k, (0, 0))[1] for k in ["test_cs", "test_js", "test_e2e"])

    lines: list[str] = []

    lines.append(f"# LOC Report")
    lines.append(f"")
    lines.append(f"Generated: {date.today().isoformat()}  ")
    lines.append(f"**Grand Total: {grand_files:,} files · {grand_loc:,} LOC**")
    lines.append(f"")
    lines.append(f"> Excludes: `node_modules/`, `bin/`, `obj/`, `artifacts/`, compiled JS (`wwwroot/js/`), third-party (`wwwroot/vendor/`), and lockfiles.")
    lines.append(f"")

    # Sort by LOC descending; keep CATEGORIES aligned by rebuilding the list in the same order
    cat_by_name = {cat["name"]: cat for cat in CATEGORIES}
    cat_totals.sort(key=lambda x: x[2], reverse=True)
    sorted_categories = [cat_by_name[name] for name, _, _ in cat_totals]

    # ── Summary table ──────────────────────────────────────────────────────
    lines.append(f"## Summary")
    lines.append(f"")
    lines.append(table_rows(cat_totals))
    lines.append(f"")
    lines.append(f"**Test : Code ratio:** `{test_loc/src_loc:.2f}x` ({test_loc:,} / {src_loc:,})")
    lines.append(f"")

    # ── Overall pie chart ──────────────────────────────────────────────────
    lines.append(f"## Distribution by Category")
    lines.append(f"")
    lines.append(mermaid_pie("LOC by Category", [(n, l) for n, _, l in cat_totals]))
    lines.append(f"")

    # ── Per-category sections ──────────────────────────────────────────────
    for cat, (_, cat_files, cat_loc) in zip(sorted_categories, cat_totals):
        lines.append(f"---")
        lines.append(f"")
        lines.append(f"## {cat['name']} — {cat_files:,} files · {cat_loc:,} LOC")
        lines.append(f"")

        rows = []
        for k in cat["keys"]:
            fc, lc = totals.get(k, (0, 0))
            label = cat["labels"].get(k, k)
            rows.append((label, fc, lc))
        rows.sort(key=lambda x: x[2], reverse=True)
        pie_slices = [(label, lc) for label, _, lc in rows]

        lines.append(table_rows(rows))
        lines.append(f"")
        lines.append(mermaid_pie(f"{cat['name']} — LOC breakdown", pie_slices))
        lines.append(f"")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Generate LOC report as Markdown.")
    parser.add_argument("--output", default=str(ROOT / "docs" / "LOC_REPORT.md"),
                        help="Output path for the markdown report (default: docs/LOC_REPORT.md)")
    args = parser.parse_args()

    print("Counting lines of code...", file=sys.stderr)
    totals = collect()

    report = build_report(totals)

    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(report, encoding="utf-8")
    print(f"Report written to: {out}", file=sys.stderr)

    # Also print a quick summary to stdout
    grand = sum(v[1] for v in totals.values())
    print(f"Grand total: {grand:,} LOC across {sum(v[0] for v in totals.values()):,} files")


if __name__ == "__main__":
    main()
