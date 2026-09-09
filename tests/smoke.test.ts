import { expect, test } from "bun:test";
import { createTodosStore, TABLES_SCHEMA } from "../client/src/storeData";

test("the scaffold's store is green at BASE: schema and default content", () => {
  const store = createTodosStore();
  expect(Object.keys(TABLES_SCHEMA)).toEqual(["todos"]);
  expect(store.getRowCount("todos")).toBe(2);
  expect(store.getCell("todos", "1", "completed")).toBe(false);
});
