import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckGroup, ErrorNote, FiltersPanel, Pagination, QuestionCard } from "../components/ui";
import { api, queryString, type QuestionPage } from "../lib/api";
import { useSession } from "../lib/session";

const ASKED_OPTIONS = [
  { value: 0, label: "Any" },
  { value: 2, label: "2+ people" },
  { value: 5, label: "5+ people" },
  { value: 10, label: "10+ people" },
];

export function QuestionsPage() {
  const { meta, user } = useSession();
  const [params, setParams] = useSearchParams();
  const filters = {
    category: params.getAll("category"),
    difficulty: params.getAll("difficulty"),
    round: params.getAll("round"),
    company: params.get("company") ?? "",
    q: params.get("q") ?? "",
    min_asked: Number(params.get("min_asked") ?? 0),
    asked_by_me: params.get("asked_by_me") === "true",
    mine: params.get("mine") === "true",
    sort: params.get("sort") ?? "most_asked",
    page: Number(params.get("page") ?? 1),
  };
  type Filters = typeof filters;

  const [data, setData] = useState<QuestionPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(filters.q);

  const update = (patch: Partial<Filters>) => {
    const next = { ...filters, page: 1, ...patch };
    setParams(queryString({ ...next, min_asked: next.min_asked || undefined, page: next.page > 1 ? next.page : undefined, sort: next.sort === "most_asked" ? undefined : next.sort }).slice(1));
  };

  const key = params.toString();
  useEffect(() => {
    setError(null);
    api
      .questions(filters)
      .then(setData)
      .catch((e) => setError(e.message));
    setSearch(filters.q);
    // `key` captures every filter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Search as you type, after a short pause.
  useEffect(() => {
    if (search === filters.q) return;
    const t = window.setTimeout(() => update({ q: search }), 350);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const activeCount =
    filters.category.length + filters.difficulty.length + filters.round.length + (filters.company ? 1 : 0) + (filters.min_asked ? 1 : 0) + (filters.asked_by_me ? 1 : 0) + (filters.mine ? 1 : 0) + (filters.q ? 1 : 0);

  return (
    <div className="layout">
      <FiltersPanel activeCount={activeCount}>
        {meta && (
          <>
            <CheckGroup
              title="Category"
              options={meta.categories.map((c) => c.name)}
              selected={filters.category}
              counts={data?.category_counts}
              onChange={(category) => update({ category })}
            />
            <fieldset className="filter-group">
              <legend>Times asked</legend>
              {ASKED_OPTIONS.map((o) => (
                <label key={o.value} className="check">
                  <input type="radio" name="min_asked" checked={filters.min_asked === o.value} onChange={() => update({ min_asked: o.value })} />
                  <span>{o.label}</span>
                </label>
              ))}
            </fieldset>
            <CheckGroup title="Difficulty" options={meta.difficulties} selected={filters.difficulty} onChange={(difficulty) => update({ difficulty })} />
            <CheckGroup title="Round" options={meta.rounds} selected={filters.round} onChange={(round) => update({ round })} />
            {user && (
              <fieldset className="filter-group">
                <legend>Mine</legend>
                <label className="check">
                  <input type="checkbox" checked={filters.asked_by_me} onChange={(e) => update({ asked_by_me: e.target.checked })} />
                  <span>Questions I was asked</span>
                </label>
                <label className="check">
                  <input type="checkbox" checked={filters.mine} onChange={(e) => update({ mine: e.target.checked })} />
                  <span>Questions I posted</span>
                </label>
              </fieldset>
            )}
          </>
        )}
      </FiltersPanel>

      <section className="results">
        <div className="page-head">
          <div>
            <h1>Interview questions</h1>
            <p className="muted">Real questions from past interviews, shared by students. 👍 the ones you were asked too.</p>
          </div>
          <Link className="btn primary" to="/questions/new">
            + Share a question
          </Link>
        </div>

        <div className="toolbar">
          <input
            type="search"
            className="search"
            placeholder="Search questions, topics, companies…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search questions"
          />
          <label className="sort">
            Sort
            <select value={filters.sort} onChange={(e) => update({ sort: e.target.value })}>
              <option value="most_asked">Most asked</option>
              <option value="newest">Newest</option>
            </select>
          </label>
        </div>

        {(filters.company || activeCount > 0) && (
          <div className="active-filters">
            {filters.company && (
              <button className="chip" onClick={() => update({ company: "" })}>
                Company: {filters.company} ✕
              </button>
            )}
            {filters.category.map((c) => (
              <button key={c} className="chip" onClick={() => update({ category: filters.category.filter((x) => x !== c) })}>
                {c} ✕
              </button>
            ))}
            {activeCount > 0 && (
              <button className="link" onClick={() => setParams("")}>
                Clear all
              </button>
            )}
          </div>
        )}

        <ErrorNote error={error} />
        {data && (
          <>
            <p className="result-count muted">
              {data.total} question{data.total === 1 ? "" : "s"}
            </p>
            {data.items.length === 0 ? (
              <div className="empty">
                <p>No questions match these filters yet.</p>
                <Link className="btn primary" to="/questions/new">
                  Be the first to share one
                </Link>
              </div>
            ) : (
              <div className="list">
                {data.items.map((q) => (
                  <QuestionCard key={q.id} question={q} />
                ))}
              </div>
            )}
            <Pagination page={data.page} total={data.total} pageSize={data.page_size} onPage={(page) => update({ page })} />
          </>
        )}
      </section>
    </div>
  );
}
