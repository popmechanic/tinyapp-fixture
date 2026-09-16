// `loading.css` drew the spinner as an inline SVG in a `::before` and spun it
// with a keyframe of its own. A ring with one transparent edge and Tailwind's
// `animate-spin` is the same picture in the system's own vocabulary, and its
// colour is the `primary` token rather than a literal `#d81b60`.
export const Loading = () => (
  <div
    id="loading"
    className="mx-auto mt-40 size-8 animate-spin rounded-full border-4 border-primary border-t-transparent"
  />
);
