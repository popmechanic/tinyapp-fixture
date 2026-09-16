import { expect, test } from "bun:test";
import { createTodosStore, TABLES_SCHEMA } from "../client/src/storeData";

test("the scaffold's store is green at BASE: schema and default content", () => {
  const store = createTodosStore();
  // `toContain`, never an exact list: the schema grows a table (and a todo
  // grows a cell) as the app does, and what this asserts is that `todos` is
  // one of them.
  expect(Object.keys(TABLES_SCHEMA)).toContain("todos");
  expect(store.getRowCount("todos")).toBe(2);
  expect(store.getCell("todos", "1", "completed")).toBe(false);
});
