/**
 * Due dates, as pure functions over a date string and a clock.
 *
 * They live beside the store module rather than in it on purpose: the linter
 * reads `client/src/storeData.ts` and takes every exported function of arity
 * one or more whose name does not start with `create` or `read` to be one of
 * the app's mutation callbacks, then walks it looking for the states it
 * reaches. `isOverdue` moves nothing, so being walked as a move is exactly
 * wrong; keeping it here is what keeps the store module's exports the list of
 * things that do move.
 *
 * A stored date is a `YYYY-MM-DD` that is a real UTC calendar date and nothing
 * else — which is what lets an ISO date be compared as a plain string.
 */

/** The UTC calendar day `now` falls on, as `YYYY-MM-DD`. */
export const dateOf = (now: Date): string => now.toISOString().slice(0, 10);

/** The `YYYY-MM-DD` shape, before the date it spells is known to be real. */
const ISO_SHAPE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Whether `value` is a `YYYY-MM-DD` naming a real UTC calendar date.
 *
 * The shape alone would take `2025-02-30`, which `Date.parse` rolls forward to
 * March 2nd; round-tripping the parsed instant back through `dateOf` is what
 * catches every such day, since a rolled date no longer spells itself.
 */
export const isIsoDate = (value: string): boolean => {
  if (!ISO_SHAPE.test(value)) {
    return false;
  }
  const instant = Date.parse(`${value}T00:00:00Z`);
  return !Number.isNaN(instant) && dateOf(new Date(instant)) === value;
};

/**
 * Whether `row` is an open todo whose due date has already gone by at `now`.
 *
 * A completed todo is never overdue however old its date, a todo with no date
 * has nothing to be late for, and a date equal to today is due rather than
 * overdue — so the comparison is strict. Two `YYYY-MM-DD` strings order the
 * same way the days they name do, which is why no parsing happens here.
 */
export const isOverdue = (
  row: {completed?: boolean; due?: string},
  now: Date,
): boolean =>
  row.completed !== true &&
  typeof row.due === 'string' &&
  row.due !== '' &&
  row.due < dateOf(now);
