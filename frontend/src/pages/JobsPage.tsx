import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckGroup, ErrorNote, FiltersPanel, JobCard, Pagination } from "../components/ui";
import { api, queryString, type Job, type Page } from "../lib/api";
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
    page: Number(params.get("page") ?? 1),
  };
  type Filters = typeof filters;

  const [data, setData] = useState<Page<Job> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(filters.q);

  const update = (patch: Partial<Filters>) => {
    const next = { ...filters, page: 1, ...patch };
    setParams(queryString({ ...next, page: next.page > 1 ? next.page : undefined }).slice(1));
  };

  const key = params.toString();
  useEffect(() => {
    setError(null);
    api
      .jobs(filters)
      .then(setData)
      .catch((e) => setError(e.message));
    setSearch(filters.q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

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

        <ErrorNote error={error} />
        {data && (
          <>
            <p className="result-count muted">
              {data.total} job{data.total === 1 ? "" : "s"}
            </p>
            {data.items.length === 0 ? (
              <div className="empty">
                <p>No open jobs match these filters.</p>
                <Link className="btn primary" to="/jobs/new">
                  Post a job
                </Link>
              </div>
            ) : (
              <div className="list">
                {data.items.map((j) => (
                  <JobCard key={j.id} job={j} />
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
