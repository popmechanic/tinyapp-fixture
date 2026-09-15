// The exam for `client/src/todoFilter.ts`: which rows a filter admits, and how
// a value the app does not recognise is read. An ordinary `bun:test` file one
// directory below the root — it bundles nothing and paints nothing, so it lives
// outside `tests/state-exams/` and the linter's exam capture does not read it.

import { expect, test } from "bun:test";
import { admits, FILTERS, filterOf } from "../client/src/todoFilter";
import type { Filter } from "../client/src/todoFilter";

// M1. `admits(filter, completed)` over the six rows of its domain — three
// filters by two values of `completed`, nothing else. Each leg is its own
// block so a red line names the row that failed.

test("leg (a) [M1] admits('all', false) is true", () => {
  expect(admits("all", false)).toBe(true);
});

test("leg (b) [M1] admits('all', true) is true", () => {
  expect(admits("all", true)).toBe(true);
});

test("leg (c) [M1] admits('open', false) is true", () => {
  expect(admits("open", false)).toBe(true);
});

test("leg (d) [M1] admits('open', true) is false", () => {
  expect(admits("open", true)).toBe(false);
});

test("leg (e) [M1] admits('done', false) is false", () => {
  expect(admits("done", false)).toBe(false);
});

test("leg (f) [M1] admits('done', true) is true", () => {
  expect(admits("done", true)).toBe(true);
});

test("legs (a)-(f) [M1] the six rows are the whole domain of admits", () => {
  // The same six rows read off together: every filter in `FILTERS` against
  // both values of `completed`, and the answer for each spelled out.
  const table: ReadonlyArray<[Filter, boolean, boolean]> = [
    ["all", false, true],
    ["all", true, true],
    ["open", false, true],
    ["open", true, false],
    ["done", false, false],
    ["done", true, true],
  ];

  expect(table.map(([filter, completed]) => admits(filter, completed))).toEqual(
    table.map(([, , expected]) => expected),
  );
});

// M2. `filterOf(value)` is the value itself for the three names the app knows,
// and `'all'` for anything else — a case-sensitive membership test.

test("leg (g) [M2] filterOf('all') is 'all'", () => {
  expect(filterOf("all")).toBe("all");
});

test("leg (h) [M2] filterOf('open') is 'open'", () => {
  expect(filterOf("open")).toBe("open");
});

test("leg (i) [M2] filterOf('done') is 'done'", () => {
  expect(filterOf("done")).toBe("done");
});

test("leg (j) [M2] filterOf(undefined) is 'all'", () => {
  expect(filterOf(undefined)).toBe("all");
});

test("leg (k) [M2] filterOf('bogus') is 'all'", () => {
  expect(filterOf("bogus")).toBe("all");
});

test("leg (l) [M2] filterOf('Open') is 'all' — the test is case-sensitive", () => {
  expect(filterOf("Open")).toBe("all");
});

// M3. The three names, in order, are the one literal this plan shares.

test("leg (m) [M3] FILTERS is exactly ['all', 'open', 'done'], in that order", () => {
  expect(FILTERS).toEqual(["all", "open", "done"]);
});
