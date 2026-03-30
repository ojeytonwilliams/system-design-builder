# System design builder

## Project

An HTML5 visual learning game where players build a company website from an empty grid, discover bottlenecks through failure, and learn system design by iterating on a living architecture.

The planning documents (PRD, summary and phased TODO) are in `design/prd.md`, `design/summary.md` and `design/todo.md` respectively.

## Commands

```sh
pnpm install         # install dependencies
pnpm test            # run Vitest
pnpm lint            # run Oxlint
pnpm lint:fix        # run Oxlint with auto-fix
pnpm fmt             # run oxfmt (format)
pnpm fmt:check       # check formatting without writing
```

Vitest globals are enabled — no need to import `describe`, `it`, `expect`.

The pre-commit hook runs `lint-staged`, which auto-fixes and formats staged JS/TS files via Oxlint and oxfmt.

## TypeScript configuration

Strict mode is on with additional checks: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitReturns`, `noUnusedLocals`, `noUnusedParameters`. Module system is `nodenext`.

## Linting rules to know

- **No default exports** (`import/no-default-export: error`) — use named exports. Config files that require default exports (e.g. Vitest config) must suppress with `// oxlint-disable-next-line import/no-default-export`.
- **Group exports** (`import/group-exports: error`) — collect all exports together rather than scattering them.
- **Max 1000 lines per file.**
- Plugins active: `eslint`, `import`, `typescript`, `react`, `oxc`, `promise`, `vitest`.

## Skills to use

Make sure to use `typescript-guidelines` when writing TypeScript and `typescript-test-guidelines` when writing tests.

## TDD

Always write tests first when working on CODE: features. Once the tests have been written and shown (via `pnpm test`) to be failing, only then should you write the implementation. Write the implementation incrementally - write a small amount of code that should make one test pass, check that test passes and then repeat until all tests pass.

## CHANGELOG + version

After a phase of the todo.md is completed, look at each of the phase's todo items. Mark them as checked if they have been completed. If any remain unchecked, implement those items before continuing.

Once all the phase's todo items are checked, run `pnpm test`, `pnpm lint` and `pnpm check`. Fix any errors before proceeding.

Once the checks are passing, increment the package.json version respecting semver. Then create a CHANGELOG.md entry with the new version and current date e.g. ## [1.2.3] - 2026-03-19

Use `git diff` to see the changes. Summarize them in the CHANGELOG.md entry.

Commit the changes with a conventional commit including a brief summary in the commit body.

## Forbidden Behaviour

Do NOT look inside node_modules. To verify a package is installed, run `pnpm list <package-name>`.
Do NOT install packages. If you need something, ask the user to install it for you.
