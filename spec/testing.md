# Testing

Vitest is the test runner. Config lives in `vitest.config.ts`; test files live in `tests/**/*.test.ts`.

## Coverage target

95 % line coverage on tested modules. This is a floor, not a ceiling.

## What to cover

Every exported pure function gets a unit test file. Each test file must cover:

- **All correct paths** — every branch that produces a valid result.
- **One error / edge path** — a single representative bad-input case. Exhaustive negative testing is not worth the maintenance cost.

## Redundancy rule

If function C orchestrates functions A and B, and A / B each have their own tests:

- C's tests cover **orchestration logic only** — call order, data threading, short-circuit behavior.
- C's tests do **not** re-verify A's or B's business logic.

Duplication between layers makes refactors painful and signals nothing useful.

## Bug-driven tests (red-green protocol)

When a bug surfaces:

1. **Research first.** Understand root cause before writing anything.
2. **Write a failing test** that captures the exact broken behavior.
3. **Fix the code.** The test goes red → green.
4. Commit test and fix together.

A test written after the fix proves nothing — it is a rubber stamp, not a safety net.

## Test types

| Type        | When to use                                | Current state |
| ----------- | ------------------------------------------ | ------------- |
| Unit        | Pure functions, zero-dependency logic      | **Active**    |
| Integration | HTTP-level behavior against the dev server | One file      |
| E2E         | Full browser flows (Playwright etc.)       | Not yet       |

Start with unit tests. When a feature genuinely needs integration or E2E coverage, suggest it — don't pre-build the harness.
