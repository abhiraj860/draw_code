import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckGroup, ErrorNote, FiltersPanel, JobCard } from "../components/ui";
import { api, queryString, type Job } from "../lib/api";
import { useSession } from "../lib/session";

export function JobsPage() {
  const { meta } = useSession();
  const [params, setParams] = useSearchParams();
  const filters = {
    job_type: params.getAll("job_type"),
    work_mode: params.getAll("work_mode"),
    experience: params.getAll("experience"),
    company: params.get("company") ?? "",
    q: params.get("q") ?? "",
    include_closed: params.get("include_closed") === "true",
  };
  type Filters = typeof filters;

  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [nextBefore, setNextBefore] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(filters.q);
  const latestRequest = useRef(0);
  const sentinel = useRef<HTMLDivElement>(null);

  const update = (patch: Partial<Filters>) => setParams(queryString({ ...filters, ...patch }).slice(1));

  /** Loads the first batch (no cursor) or the next one (older than `before`). */
  const load = async (before?: number) => {
    const request = ++latestRequest.current;
    setLoading(true);
    setError(null);
    try {
      const batch = await api.jobs({ ...filters, before });
      if (request !== latestRequest.current) return; // filters changed meanwhile
      setJobs((current) => (before ? [...current, ...batch.items.filter((j) => !current.some((c) => c.id === j.id))] : batch.items));
      setTotal(batch.total);
      setNextBefore(batch.next_before);
    } catch (e) {
      if (request === latestRequest.current) setError((e as Error).message);
    } finally {
      if (request === latestRequest.current) setLoading(false);
    }
  };

  const key = params.toString();
  useEffect(() => {
    setJobs([]);
    setTotal(null);
    setNextBefore(null);
    load();
    setSearch(filters.q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Load the next batch when the bottom of the list comes near the screen.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || nextBefore === null || loading || error) return;
    const observer = new IntersectionObserver((entries) => entries[0].isIntersecting && load(nextBefore), { rootMargin: "600px 0px" });
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextBefore, loading, error, key]);

  useEffect(() => {
    if (search === filters.q) return;
    const t = window.setTimeout(() => update({ q: search }), 350);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const activeCount = filters.job_type.length + filters.work_mode.length + filters.experience.length + (filters.include_closed ? 1 : 0);

  return (
    <div className="layout">
      <FiltersPanel activeCount={activeCount}>
        {meta && (
          <>
            <CheckGroup title="Job type" options={meta.job_types} selected={filters.job_type} onChange={(job_type) => update({ job_type })} />
            <CheckGroup title="Work mode" options={meta.work_modes} selected={filters.work_mode} onChange={(work_mode) => update({ work_mode })} />
            <CheckGroup title="Experience" options={meta.experience_levels} selected={filters.experience} onChange={(experience) => update({ experience })} />
            <fieldset className="filter-group">
              <legend>Status</legend>
              <label className="check">
                <input type="checkbox" checked={filters.include_closed} onChange={(e) => update({ include_closed: e.target.checked })} />
                <span>Show closed jobs</span>
              </label>
            </fieldset>
          </>
        )}
      </FiltersPanel>

      <section className="results">
        <div className="page-head">
          <div>
            <h1>Jobs</h1>
            <p className="muted">Openings shared by students and recruiters. Check a company's past questions before you apply.</p>
          </div>
          <Link className="btn primary" to="/jobs/new">
            + Post a job
          </Link>
        </div>

        <div className="toolbar">
          <input type="search" className="search" placeholder="Search title, company, location…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search jobs" />
        </div>

        {filters.company && (
          <div className="active-filters">
            <button className="chip" onClick={() => update({ company: "" })}>
              Company: {filters.company} ✕
            </button>
            <Link className="link" to={`/questions?company=${encodeURIComponent(filters.company)}`}>
              See {filters.company} interview questions →
            </Link>
          </div>
        )}

        {total !== null && (
          <>
            <p className="result-count muted">
              {total} job{total === 1 ? "" : "s"}
            </p>
            {jobs.length === 0 ? (
              <div className="empty">
                <p>No open jobs match these filters.</p>
                <Link className="btn primary" to="/jobs/new">
                  Post a job
                </Link>
              </div>
            ) : (
              <div className="list">
                {jobs.map((j) => (
                  <JobCard key={j.id} job={j} />
                ))}
              </div>
            )}
          </>
        )}

        <ErrorNote error={error} />
        <div ref={sentinel} className="feed-end" aria-live="polite">
          {loading ? (
            <span className="muted">Loading jobs…</span>
          ) : error ? (
            <button className="btn" onClick={() => load(nextBefore ?? undefined)}>
              Try again
            </button>
          ) : nextBefore !== null ? (
            <button className="btn" onClick={() => load(nextBefore)}>
              Load more
            </button>
          ) : (
            jobs.length > 0 && <span className="muted">{total === 1 ? "That's the only matching job." : `You've seen all ${total} jobs.`}</span>
          )}
        </div>
      </section>
    </div>
  );
}
