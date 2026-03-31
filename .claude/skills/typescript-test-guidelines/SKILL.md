---
name: typescript-test-guidelines
description: Additional guidelines for writing TypeScript. Use when writing or modifying TypeScript test files.
---

# TypeScript Test Guidelines

Follow these rules when writing TypeScript tests, these rules supplement those in `typescript-guidelines`

  
## Magic numbers

- Use sparingly. Prefer named fixtures.
  ```ts
  for(const n = 0; n < MAX_ITERATIONS; n++) // correct
  for(const n = 0; n < 10; n++) // wrong
  ```
- Exceptions: when it's obvious in context.
  ```ts
  expect(emptyArray).toHaveLength(0)
  ```

## Naming

- File names use kebab-case: `level-loader.test.ts`, `grid-coord.test.ts`.
- Test files are co-located with the source file: `level-loader.ts` → `level-loader.test.ts`.

## Test conventions

- Use `describe(ClassName, ...)` when testing a class i.e. pass the class directly to describe; use `describe("description in lowercase", ...)` for everything else.
- Structure each test with arrange / act / assert, separated by blank lines:
  ```ts
  it("loads level-01 and returns a LevelDefinition with the correct id", () => {
    const loader = new LevelLoader();

    const result = loader.load("level-01");

    expect(result.id).toBe("level-01");
  });
  ```
- Keep the number of assertions/expects low. Ideally one.
- Extract the setup code into before hooks/setup functions to keep the test body focused.

## Preferred assertions

- `expect(array).toHaveLength(5)` rather than `expect(array.length).toBe(5)`
- `expect(isDone).toBeTruthy()` rather than `expect(isDone).toBe(true)`

## Mocks and spies

- Prefer mocks and spies over direct modifications to global object.
  ```ts
  vi.spyOn(Math, 'random').mockReturnValue(0.123456789); // good, easily undo
  Math.random = () => 0.123456789; // bad
  ```
  
## Long running unit tests

- If the test does not terminate after a minute, kill it and try again.
