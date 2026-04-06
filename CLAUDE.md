# Project Guidelines

## Package Manager

Always use `pnpm` instead of `npm` or `yarn`.

## Git Workflow

Always create a pull request for changes. Never push directly to main.

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <description>

[optional body]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:

- `feat(gateway): add retry logic for API calls`
- `fix(ui): correct cursor position in file browser`
- `docs: update README with badges`
- `test: fix flaky navigation test`

After creating a PR, monitor its CI status. If CI fails, investigate and fix promptly.

## Language

Always use English in code, comments, and commit messages.
