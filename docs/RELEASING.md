# Releasing

This repository uses lightweight tag-based releases.

## Release Checklist

1. Confirm the release scope is documented in `CHANGELOG.md`.
2. Update version metadata in `FirePlanningTool.csproj` and `package.json`.
3. Run `dotnet build fire.sln`.
4. Run `make test`.
5. Review public-facing docs for setup or behavior changes.
6. Create and push a semantic version tag in the form `vX.Y.Z`.
7. Verify the `Release` GitHub Actions workflow completed successfully.
8. Review the generated GitHub release notes and attached artifact.

## Tagging a Release

```bash
git tag v1.2.0
git push origin v1.2.0
```

The release workflow will:

- restore dependencies
- build the frontend and backend
- run the full test suite with `make test`
- publish a release artifact
- create a GitHub release for the pushed tag

## Notes

- Keep `CHANGELOG.md` as the source of truth for released changes.
- Use the `Unreleased` section for changes that are merged but not yet tagged.
- If release validation fails, delete the tag, fix the issue, and recreate the tag.