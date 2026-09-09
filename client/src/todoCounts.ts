// The counter is worked out from the todos table itself, so it is a pure
// function of the rows and nothing holds it between renders.

export const countTodos = (
  table: Record<string, {text?: string; completed?: boolean}>,
): {done: number; total: number} => {
  const rows = Object.values(table);

  return {
    done: rows.filter((row) => row.completed === true).length,
    total: rows.length,
  };
};
