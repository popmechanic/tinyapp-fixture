/**
 * The view-satisfiability rule: every view an exam asserts holds over the state
 * it names.
 *
 * An exam's `view` is a claim about the page its expected state paints. This
 * rule settles that claim without opening anything: it renders the expected
 * snapshot with `ctx.render` — the static markup, with each input's `checked`
 * already reflected onto `data-checked` the way a live page carries it — and
 * reads the view against that markup with `tinyapp-exam`'s own `assertView`, so
 * the linter and the exam agree on what a view means by construction.
 *
 * What a finding adds to the breach `assertView` reports is the fix, and the fix
 * is computed over the same markup: a `checked` view over a selector matching
 * two boxes is told which of them is in fact checked — `#todo-1` for run-7's
 * click, which is also what tells a reader the click on the first box never
 * reached that state — and a count that is out is told the count the state has.
 */

import {parse, type HTMLElement} from 'node-html-parser';
import {assertView} from 'tinyapp-exam';

import type {ExamSpec, Finding, LintContext, Rule, View} from '../types';

/** The prefix `assertView` writes before each breach. */
const prefixOf = (selector: string): string => `view ${selector}: `;

/** The views of a spec as a list — one view, a list of them, or none at all. */
const viewsOf = (view: ExamSpec['view']): View[] =>
  view === undefined ? [] : Array.isArray(view) ? view : [view];

/**
 * Each failure `assertView` returned, paired with the view it came from.
 *
 * The failures arrive in list order, one per failing entry, so the pairing is a
 * walk down the views rather than a split of the string: a selector may itself
 * hold `: `, and the prefix is the only part of a failure this rule needs the
 * view to read.
 */
const breaches = (
  views: View[],
  failures: string[],
): {view: View; breach: string}[] => {
  const paired: {view: View; breach: string}[] = [];
  let at = 0;

  for (const failure of failures) {
    while (at < views.length && !failure.startsWith(prefixOf(views[at]!.selector))) {
      at++;
    }
    const view = views[at];
    if (view === undefined) {
      break;
    }
    paired.push({view, breach: failure.slice(prefixOf(view.selector).length)});
  }

  return paired;
};

/** `#<id>` when the match has one, and its 1-based position among `n` otherwise. */
const nameOf = (match: HTMLElement, index: number, n: number): string => {
  const id = match.getAttribute('id');
  return id === undefined || id === null || id === ''
    ? `match ${index + 1} of ${n}`
    : `#${id}`;
};

/**
 * Every match reading `<want>`, named, comma-separated.
 *
 * `data-checked` is how an `<input>`'s checked property reaches the markup —
 * the capture's render reflects it the way a live page does — and
 * `aria-checked` is how a `role="checkbox"` element carries the same state in
 * markup of its own, which React's static render writes as a real attribute. So
 * the fix line reads both, exactly as `assertView` does: the rule and the exam
 * would otherwise disagree about which matches are checked.
 */
const readingChecked = (matched: HTMLElement[], want: 'true' | 'false'): string =>
  matched
    .map((match, index) => ({match, index}))
    .filter(
      ({match}) =>
        match.getAttribute('data-checked') === want ||
        match.getAttribute('aria-checked') === want,
    )
    .map(({match, index}) => nameOf(match, index, matched.length))
    .join(', ');

/** What to do about a view asking every match to be checked when one is not. */
const narrowerSelector = (matched: HTMLElement[], key: 'checked' | 'unchecked') => {
  const [want, mirror] =
    key === 'checked' ? (['true', 'unchecked'] as const) : (['false', 'checked'] as const);
  const names = readingChecked(matched, want);
  return names === ''
    ? `no match is ${key}: expect ${mirror}, or a state in which one is`
    : `name the narrower selector: ${names}`;
};

/** Every match's `textContent`, trimmed and quoted. */
const textsOf = (matched: HTMLElement[]): string =>
  matched.map((match) => JSON.stringify(match.textContent.trim())).join(' | ');

/**
 * Every match's value of `name`, quoted.
 *
 * A match without the attribute reads as the empty string: the line quotes what
 * the markup carries either way, and `""` is what a selector-writer sees.
 */
const attrsOf = (matched: HTMLElement[], name: string): string =>
  matched.map((match) => JSON.stringify(match.getAttribute(name) ?? '')).join(' | ');

/** The one thing to do about `breach`, read off the same markup it came from. */
const fixOf = (breach: string, matched: HTMLElement[]): string => {
  const count = /^expected (\d+) matches, found (\d+)$/.exec(breach);
  if (count !== null) {
    return count[2] === '0'
      ? 'no element matches: name a selector the rendered state has'
      : `expect count ${count[2]}, or name a narrower selector`;
  }

  const absent = /^expected no matches, found (\d+)$/.exec(breach);
  if (absent !== null) {
    return `expect count ${absent[1]}, or a state without them`;
  }

  if (/^expected at least one (?:un)?checked match, found none$/.test(breach)) {
    return 'no element matches: name a selector the rendered state has';
  }

  if (breach === 'a match is not checked' || breach === 'a match is not unchecked') {
    return narrowerSelector(matched, breach.endsWith('unchecked') ? 'unchecked' : 'checked');
  }

  if (breach.startsWith('no match has text ')) {
    return `the matches read: ${textsOf(matched)}`;
  }

  const attr = /^no match has ([^=]+)=/.exec(breach);
  if (attr !== null) {
    return `the matches carry ${attr[1]}=${attrsOf(matched, attr[1]!)}`;
  }

  return 'name a view the rendered state satisfies';
};

/** Every view of one exam, read against the state that exam expects. */
const examFindings = (ctx: LintContext, exam: ExamSpec): Finding[] => {
  const snapshot = ctx.snapshots.find((file) => file.path === exam.expected);
  if (snapshot === undefined) {
    return [
      {
        file: exam.path,
        subject: `expected ${exam.expected}`,
        problem: 'no such snapshot',
        fix: 'name a file under state-exams/expected/',
      },
    ];
  }

  const views = viewsOf(exam.view);
  if (views.length === 0) {
    return [];
  }

  const html = ctx.render(snapshot.content);
  const failures = assertView(html, exam.view);
  if (failures.length === 0) {
    return [];
  }

  const root = parse(html);
  return breaches(views, failures).map(({view, breach}) => ({
    file: exam.path,
    subject: `view ${view.selector} over ${exam.expected}`,
    problem: breach,
    fix: fixOf(breach, root.querySelectorAll(view.selector)),
  }));
};

const rule: Rule = {
  name: 'views',
  run: (ctx: LintContext): Finding[] =>
    ctx.exams.flatMap((exam) => examFindings(ctx, exam)),
};

export default rule;
