import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ErrorNote } from "../components/ui";
import { api, type Company } from "../lib/api";

export function CompaniesPage() {
  const [query, setQuery] = useState("");
  const [companies, setCompanies] = useState<Company[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => {
      api
        .companies(query)
        .then(setCompanies)
        .catch((e) => setError(e.message));
    }, 200);
    return () => window.clearTimeout(t);
  }, [query]);

  return (
    <div className="narrow wide">
      <div className="page-head">
        <div>
          <h1>Companies</h1>
          <p className="muted">Every company with shared questions or open jobs.</p>
        </div>
      </div>
      <div className="toolbar">
        <input type="search" className="search" placeholder="Find a company…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Find a company" />
      </div>
      <ErrorNote error={error} />
      {companies && companies.length === 0 && <div className="empty">No companies yet. They appear here once someone posts a question or job.</div>}
      <div className="company-grid">
        {companies?.map((c) => (
          <div key={c.name} className="company-card">
            <h3>{c.name}</h3>
            <div className="company-links">
              <Link to={`/questions?company=${encodeURIComponent(c.name)}`}>
                {c.question_count} question{c.question_count === 1 ? "" : "s"}
              </Link>
              <Link to={`/jobs?company=${encodeURIComponent(c.name)}&include_closed=true`}>
                {c.job_count} job{c.job_count === 1 ? "" : "s"}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
