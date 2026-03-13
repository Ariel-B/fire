# Contributing to FIRE Planning Tool

Thank you for your interest in contributing to the FIRE Planning Tool! This document provides guidelines and instructions for contributing to the project.

## Getting Started

### Prerequisites
- .NET 9.0 SDK or later
- Node.js 18 or later
- Git

### Setting Up Your Development Environment

1. **Clone the repository**
   ```bash
   git clone https://github.com/Ariel-B/fire.git
   cd fire
   ```

2. **Configure your Finnhub API Key using User Secrets**

   User Secrets are the secure way to store sensitive data locally without risking accidental commits to version control.

   ```bash
   # Initialize user secrets for the project
   dotnet user-secrets init
   
   # Set your Finnhub API key (get one free from https://finnhub.io)
   dotnet user-secrets set "Finnhub:ApiKey" "your_api_key_here"
   ```

   This stores your API key securely in your user profile (`~/.microsoft/usersecrets/fire-planning-tool-dev/`), not in the project files.

   **Note**: The `UserSecretsId` in `FirePlanningTool.csproj` (`fire-planning-tool-dev`) matches the directory name where your secrets are stored. This ID ensures your secrets are kept separate from other projects.

3. **Install dependencies, build, and run**

   ```bash
   dotnet restore
   npm install
   dotnet build fire.sln
   dotnet run
   ```

   The application will be available at `http://localhost:5162`

## Development Guidelines

### Code Style

- Follow C# naming conventions (PascalCase for classes/methods, camelCase for variables)
- Use meaningful variable and function names
- Keep methods focused and single-responsibility
- Add XML documentation comments for public methods and classes

### Financial Calculations

- All internal calculations use USD as the base currency
- Display currency conversion happens at the UI layer
- Always test calculations with both USD and ILS to ensure consistency
- Document any calculation assumptions in code comments

### Frontend (HTML/JavaScript)
- Use semantic HTML5
- Maintain RTL (Right-to-Left) layout support for Hebrew
- Test responsiveness on mobile, tablet, and desktop
- Use Chart.js for all data visualizations
- Localize strings using data attributes

### Testing

#### Running Tests
```bash
# Run the full documented suite
make test

# Backend only
dotnet test fire.sln

# Frontend only
npm test -- --runInBand
```

#### Writing Tests
- Test files are located in `wwwroot/tests/`
- Test critical financial calculations thoroughly
- Test both USD and ILS currency handling
- Include edge cases (zero values, negative inputs, extreme scenarios)
- Prefer `make test` before opening a pull request so backend and frontend suites both run.

### Commit Messages
Use clear, descriptive commit messages:
- Good: `Fix USD/ILS conversion in portfolio calculations`
- Poor: `Fix bug` or `Update code`

Format: `[Type] Short description`
- Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`
- Example: `feat: Add currency conversion tests`

## Project Structure

```
fire/
├── src/                 # Backend C# source code
│   ├── Controllers/     # ASP.NET Core API controllers
│   ├── Models/          # Data models and DTOs
│   ├── Services/        # Business logic and calculations
│   └── Program.cs       # Application startup configuration
├── wwwroot/             # Static files (HTML, CSS, JS, images)
│   └── tests/          # Client-side test files
├── docs/                # Documentation
├── appsettings.json     # Configuration (secrets from environment)
└── FirePlanningTool.csproj
```

## Key Components to Know

### FireCalculator (src/Services/FireCalculator.cs)
Core financial calculation engine. Uses USD as base currency internally.

### CurrencyConverter (src/Services/CurrencyConverter.cs)
Handles USD/ILS conversion. Default rate is 3.6 but can be updated.

### FirePlanController (src/Controllers/FirePlanController.cs)
Main API endpoint for plan calculations and results.

### Frontend (wwwroot/index.html)
Single-page application with two-column layout:
- Left: Input controls
- Right: Results and visualizations

Frontend entry points:
- `wwwroot/ts/app-shell.ts` owns bootstrap/startup wiring, top-level event listeners, and tab activation
- `wwwroot/ts/services/state.ts` is the canonical frontend state store; update it together with `wwwroot/ts/types/index.ts` whenever shared app-state shape changes
- `wwwroot/ts/app.ts` is the thinner facade that imports the canonical state store, delegates startup wiring to the shell plus focused coordinators, and keeps `window.fireApp` limited to compatibility-safe user actions
- `wwwroot/ts/orchestration/portfolio-coordinator.ts` owns portfolio CRUD orchestration, summaries, sorting, and accumulation tab refreshes
- `wwwroot/ts/orchestration/expense-coordinator.ts` owns planned-expense CRUD orchestration, totals, sorting, and expense chart refreshes
- `wwwroot/ts/orchestration/retirement-coordinator.ts` owns retirement allocation editing, retirement tab visibility, and the optional retirement-portfolio toggle behavior
- `wwwroot/ts/orchestration/rsu-coordinator.ts` owns RSU form event wiring, summary/UI synchronization, stock-price fetch orchestration, and RSU tab activation behavior
- `wwwroot/ts/orchestration/results-coordinator.ts` owns results summary rendering and chart refresh coordination while `chart-manager.ts` stays responsible for chart rendering
- `wwwroot/ts/persistence/plan-persistence.ts` owns saved-plan compatibility, native file save/load flows, and Excel export modal orchestration

## Common Tasks

### Adding a New Feature
1. Create/update tests first (TDD approach)
2. Implement the feature
3. Update relevant documentation
4. Test both USD and ILS currencies
5. Submit pull request with clear description

### Fixing a Bug
1. Add a test that reproduces the bug
2. Implement the fix
3. Verify the test now passes
4. Check for similar issues elsewhere in the code
5. Submit pull request with `[fix]` prefix

### Updating Documentation
- Keep README.md current with major features
- Document API endpoints in docs/API.md
- Add comments to complex calculations
- Update CHANGELOG.md with notable changes
- After significant UI changes, regenerate the documentation screenshots with `npm run screenshots` (or `make screenshots`) so the images under `docs/images/` stay current

## Reporting Issues

When reporting a bug, please include:
- Description of the issue
- Steps to reproduce
- Expected vs. actual behavior
- Screenshots if applicable
- Browser/platform information
- Which currency (USD/ILS) exhibits the issue

Use the GitHub issue templates to keep reports actionable. For security issues, follow [`docs/security/SECURITY.md`](security/SECURITY.md) instead of opening a public issue.

## Questions or Need Help?

Open a GitHub question issue using the provided template.

## Code Review

Pull requests will be reviewed for:
- Code quality and style consistency
- Test coverage
- Financial calculation accuracy
- Security considerations
- Documentation completeness

Thank you for contributing! 🚀
