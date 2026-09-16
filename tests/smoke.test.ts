import { expect, test } from "bun:test";
import { createTodosStore, TABLES_SCHEMA } from "../client/src/storeData";

test("the scaffold's store is green at BASE: schema and default content", () => {
  const store = createTodosStore();
  // Among, not the whole list: the schema grows a table (and a cell) as the
  // app does, and what this line means is that the todos table is still there.
  expect(Object.keys(TABLES_SCHEMA)).toContain("todos");
  expect(store.getRowCount("todos")).toBe(2);
  expect(store.getCell("todos", "1", "completed")).toBe(false);
});
