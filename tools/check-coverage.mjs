import fs from 'node:fs';

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];

    if (key.startsWith('--') && value) {
      args[key.slice(2)] = value;
      index += 1;
    }
  }

  return args;
}

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function readText(path) {
  return fs.readFileSync(path, 'utf8');
}

function parseBackendCoverage(xml) {
  const summaryMatch = xml.match(
    /<Summary[^>]*numSequencePoints="(\d+)"[^>]*visitedSequencePoints="(\d+)"[^>]*numBranchPoints="(\d+)"[^>]*visitedBranchPoints="(\d+)"[^>]*visitedMethods="(\d+)"[^>]*numMethods="(\d+)"/
  );

  if (!summaryMatch) {
    throw new Error('Could not parse backend coverage summary from OpenCover XML.');
  }

  const [
    ,
    numSequencePoints,
    visitedSequencePoints,
    numBranchPoints,
    visitedBranchPoints,
    visitedMethods,
    numMethods,
  ] = summaryMatch.map((value, index) => (index === 0 ? value : Number(value)));

  return {
    line: (visitedSequencePoints * 100) / numSequencePoints,
    branch: (visitedBranchPoints * 100) / numBranchPoints,
    method: (visitedMethods * 100) / numMethods,
  };
}

function parseFrontendCoverage(summary) {
  return {
    statements: summary.total.statements.pct,
    branches: summary.total.branches.pct,
    functions: summary.total.functions.pct,
    lines: summary.total.lines.pct,
  };
}

function formatPercent(value) {
  return value.toFixed(2);
}

function formatDelta(value) {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}`;
}

function buildResults(actuals, thresholds) {
  return [
    {
      category: 'Backend',
      metric: 'line',
      actual: actuals.backend.line,
      threshold: thresholds.backend.line,
    },
    {
      category: 'Backend',
      metric: 'branch',
      actual: actuals.backend.branch,
      threshold: thresholds.backend.branch,
    },
    {
      category: 'Backend',
      metric: 'method',
      actual: actuals.backend.method,
      threshold: thresholds.backend.method,
    },
    {
      category: 'Frontend',
      metric: 'statements',
      actual: actuals.frontend.statements,
      threshold: thresholds.frontend.statements,
    },
    {
      category: 'Frontend',
      metric: 'branches',
      actual: actuals.frontend.branches,
      threshold: thresholds.frontend.branches,
    },
    {
      category: 'Frontend',
      metric: 'functions',
      actual: actuals.frontend.functions,
      threshold: thresholds.frontend.functions,
    },
    {
      category: 'Frontend',
      metric: 'lines',
      actual: actuals.frontend.lines,
      threshold: thresholds.frontend.lines,
    },
  ].map((result) => ({
    ...result,
    delta: result.actual - result.threshold,
    passed: result.actual >= result.threshold,
  }));
}

function writeSummary(results) {
  const closestResult = [...results].sort((left, right) => left.delta - right.delta)[0];
  const lines = [
    '## Coverage Gate',
    '',
    `Tightest margin: ${closestResult.category} ${closestResult.metric} ${formatDelta(closestResult.delta)} pts versus threshold.`,
    '',
    '| Category | Metric | Actual | Threshold | Delta | Status |',
    '| --- | --- | ---: | ---: | ---: | --- |',
    ...results.map((result) =>
      `| ${result.category} | ${result.metric} | ${formatPercent(result.actual)}% | ${formatPercent(result.threshold)}% | ${formatDelta(result.delta)} pts | ${result.passed ? 'PASS' : 'FAIL'} |`
    ),
  ];

  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join('\n')}\n`);
  }

  console.log(lines.join('\n'));
}

const args = parseArgs(process.argv.slice(2));

if (!args.backend || !args.frontend || !args.thresholds) {
  console.error('Usage: node tools/check-coverage.mjs --backend <opencover.xml> --frontend <coverage-summary.json> --thresholds <thresholds.json>');
  process.exit(1);
}

const thresholds = readJson(args.thresholds);
const actuals = {
  backend: parseBackendCoverage(readText(args.backend)),
  frontend: parseFrontendCoverage(readJson(args.frontend)),
};

const results = buildResults(actuals, thresholds);
writeSummary(results);

const failedResults = results.filter((result) => !result.passed);

if (failedResults.length > 0) {
  console.error('Coverage gate failed.');
  process.exit(1);
}