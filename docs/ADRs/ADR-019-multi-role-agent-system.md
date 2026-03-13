# ADR-019: Multi-Role Agent System for Development Workflow

**Status**: Accepted

**Date**: 2024-11

**Deciders**: Development Team, Technical Leadership

**Technical Story**: GitHub Copilot agent and skill configuration

## Context

The FIRE Planning Tool development needed a structured approach to:
- Guide AI-assisted development with domain expertise
- Ensure consistent adherence to architectural patterns
- Maintain code quality and best practices
- Provide specialized guidance for different development tasks
- Enable consistent workflows across team members
- Document development standards and patterns

Traditional documentation alone wasn't sufficient to ensure consistent application of best practices. The team needed a way to embed expert guidance directly into the development workflow.

## Decision

Implement a **Multi-Role Agent System** using GitHub Copilot with specialized agent roles and instruction files that provide domain-specific guidance for different development tasks.

### Agent Structure:

1. **Architecture & Design Agents**
   - `arch.agent.md` - Senior Cloud Architect for system design
   - `sw-architect.agent.md` - Fintech Software Architect
   - `se-system-architecture-reviewer.agent.md` - Architecture reviews

2. **Development Agents**
   - `expert-dotnet-software-engineer.agent.md` - .NET best practices
   - `sr-full-stack-engineer.agent.md` - Full-stack development
   - `CSharpExpert.agent.md` - C# language expertise
   - `tdd-red.agent.md`, `tdd-green.agent.md`, `tdd-refactor.agent.md` - TDD workflow

3. **Specialized Agents**
   - `devops-engineer.agent.md` - CI/CD and deployment
   - `qa-engineer.agent.md` - Testing and quality
   - `se-security-reviewer.agent.md` - Security reviews
   - `se-technical-writer.agent.md` - Documentation
   - `ux-architect.agent.md` - UX design guidance

4. **Instruction Files** (`.github/instructions/`)
   - `dotnet-architecture-good-practices.instructions.md` - DDD & SOLID
   - `aspnet-rest-apis.instructions.md` - API development
   - `typescript-5-es2022.instructions.md` - Frontend development
   - `containerization-docker-best-practices.instructions.md` - Docker
   - `github-actions-ci-cd-best-practices.instructions.md` - CI/CD
   - `performance-optimization.instructions.md` - Performance

5. **Skills** (`.github/skills/`)
   - Modular, reusable knowledge modules
   - Mapped to specific development tasks
   - Referenced by agents for specialized guidance

### Key Principles:
- **Domain Expertise**: Each agent provides expert-level guidance in its domain
- **Consistency**: Ensures uniform application of patterns and practices
- **Context-Aware**: Agents understand project structure and conventions
- **Workflow Integration**: Embedded in development workflow
- **Documentation as Code**: Standards codified in agent instructions

## Consequences

### Positive
- **Consistent Quality**: All AI-assisted code follows project standards
- **Expert Guidance**: Access to architecture, security, and domain expertise
- **Faster Onboarding**: New developers guided by expert agents
- **Living Documentation**: Standards are actively used, not just referenced
- **Reduced Code Review Load**: Many issues caught before review
- **Pattern Enforcement**: DDD, SOLID, and architectural patterns consistently applied
- **Specialization**: Right expert for each task type
- **Knowledge Capture**: Team expertise codified in agents

### Negative
- **Maintenance Overhead**: Agents and instructions need updates
- **File Proliferation**: Many agent and instruction files to manage
- **Learning Curve**: Developers need to know which agent to use when
- **Potential Conflicts**: Different agents may give conflicting advice

### Neutral
- **AI-Dependent**: Benefits require GitHub Copilot or similar AI tools
- **Evolving Practice**: Agent patterns and best practices still maturing

## Alternatives Considered

### Alternative 1: Traditional Documentation Only
**Description**: Maintain README, wiki, and architecture docs

**Pros**:
- Simple, well-understood
- No special tooling required
- Easy to edit and update

**Cons**:
- Often outdated or ignored
- Not integrated into workflow
- Passive reference, not active guidance
- Inconsistent application of standards

**Why not chosen**: Documentation alone doesn't ensure consistent application of patterns in AI-assisted development.

### Alternative 2: Code Templates and Generators
**Description**: Scaffolding tools and code generators

**Pros**:
- Automated code generation
- Enforces structure
- Fast initial setup

**Cons**:
- Rigid, hard to customize
- Only helps at creation time
- Doesn't guide modifications
- Requires maintenance of templates

**Why not chosen**: Templates help with initial creation but don't provide ongoing guidance during development and refactoring.

### Alternative 3: Custom Linting Rules
**Description**: ESLint/TSLint plugins, .NET analyzers

**Pros**:
- Automated enforcement
- Catches violations immediately
- IDE integration

**Cons**:
- Limited to syntax and patterns
- Can't capture architectural wisdom
- No guidance, just enforcement
- Can't explain "why"

**Why not chosen**: Linters catch violations but don't teach or guide. They're complementary, not a replacement.

### Alternative 4: Centralized Expert Review Board
**Description**: All changes reviewed by architects

**Pros**:
- High quality reviews
- Expert oversight
- Mentoring opportunity

**Cons**:
- Bottleneck on experts
- Slow feedback loop
- Doesn't scale with team size
- Expensive expert time

**Why not chosen**: Doesn't scale. Agents democratize expert guidance without bottlenecking on senior staff.

## Implementation Notes

Directory structure:
```
.github/
├── agents/                          # Agent role definitions
│   ├── arch.agent.md
│   ├── sw-architect.agent.md
│   ├── expert-dotnet-software-engineer.agent.md
│   ├── sr-full-stack-engineer.agent.md
│   ├── devops-engineer.agent.md
│   ├── qa-engineer.agent.md
│   └── [38 more agents]
├── instructions/                    # Development instruction files
│   ├── dotnet-architecture-good-practices.instructions.md
│   ├── aspnet-rest-apis.instructions.md
│   ├── typescript-5-es2022.instructions.md
│   └── [12 more instruction files]
└── skills/                          # Reusable skill modules
    ├── README.md
    ├── QUICK_REFERENCE.md
    └── [skill directories]
```

Agent activation patterns:
- **Architecture decisions**: Use `arch` or `sw-architect` agents
- **Code implementation**: Use `expert-dotnet-software-engineer` or `sr-full-stack-engineer`
- **TDD workflow**: Use `tdd-red`, `tdd-green`, `tdd-refactor` sequence
- **Security reviews**: Use `se-security-reviewer` agent
- **Performance optimization**: Use `performance-optimization` instructions

Example agent metadata (from `sw-architect.agent.md`):
```yaml
---
description: 'Senior Software Architect specializing in fintech applications - system design, architecture reviews, scalability, security, and compliance.'
tools: ['edit', 'search', 'runCommands', 'githubRepo', ...]
---
```

Agent responsibilities are clearly defined in each file, preventing overlap and ensuring appropriate expertise is applied to each task.

## References

- [Agent Files](.github/agents/)
- [Instruction Files](.github/instructions/)
- [Skills](.github/skills/)
- [GitHub Copilot Documentation](https://docs.github.com/en/copilot)
- [Copilot Instructions](.github/copilot-instructions.md)
