import { useEffect, useId, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api, type Company, type Job, type Question } from "../lib/api";
import { categoryClass, deadlineLabel, monthLabel, timeAgo } from "../lib/format";
import { useSession } from "../lib/session";

/** Sends signed-out users to the login page, then back here. */
export function useLoginRedirect() {
  const navigate = useNavigate();
  const location = useLocation();
  return () => navigate(`/login?next=${encodeURIComponent(location.pathname + location.search)}`);
}

export function CategoryBadge({ category }: { category: string }) {
  return <span className={`badge ${categoryClass(category)}`}>{category}</span>;
}

export function DifficultyPill({ difficulty }: { difficulty: string }) {
  return <span className={`pill diff-${difficulty.toLowerCase()}`}>{difficulty}</span>;
}

/** 👍 "I was asked this too". Toggles; one vote per user. */
export function AskedButton({ question, onChange }: { question: Question; onChange?: (q: Question) => void }) {
  const { user } = useSession();
  const toLogin = useLoginRedirect();
  const [state, setState] = useState({ count: question.asked_count, mine: question.asked_by_me });
  const [busy, setBusy] = useState(false);

  useEffect(() => setState({ count: question.asked_count, mine: question.asked_by_me }), [question]);

  const toggle = async () => {
    if (!user) return toLogin();
    setBusy(true);
    try {
      const r = await api.toggleAsked(question.id);
      setState({ count: r.asked_count, mine: r.asked_by_me });
      onChange?.({ ...question, asked_count: r.asked_count, asked_by_me: r.asked_by_me });
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      className={`asked ${state.mine ? "on" : ""}`}
      onClick={toggle}
      disabled={busy}
      aria-pressed={state.mine}
      title={state.mine ? "You were asked this. Click to undo." : "Were you asked this too? Give it a thumbs-up."}
    >
      <span aria-hidden>👍</span>
      <span className="asked-count">{state.count}</span>
      <span className="asked-label">{state.mine ? "Asked to me" : "Asked to me too"}</span>
    </button>
  );
}

export function QuestionCard({ question }: { question: Question }) {
  return (
    <article className="card">
      <div className="card-main">
        <div className="card-meta">
          <Link className="company" to={`/questions?company=${encodeURIComponent(question.company)}`}>
            {question.company}
          </Link>
          <CategoryBadge category={question.category} />
          <DifficultyPill difficulty={question.difficulty} />
        </div>
        <h3 className="card-title">
          <Link to={`/questions/${question.id}`}>{question.title}</Link>
        </h3>
        <p className="card-excerpt">{question.body}</p>
        <div className="card-foot">
          <span>{question.round}</span>
          {question.role && <span>{question.role}</span>}
          {question.asked_on && <span>Asked {monthLabel(question.asked_on)}</span>}
          {question.tags.map((t) => (
            <Link key={t} className="tag" to={`/questions?q=${encodeURIComponent(t)}`}>
              #{t}
            </Link>
          ))}
          <span className="muted">
            by {question.author} · {timeAgo(question.created_at)}
          </span>
        </div>
      </div>
      <AskedButton question={question} />
    </article>
  );
}

export function JobCard({ job }: { job: Job }) {
  const deadline = deadlineLabel(job.deadline);
  return (
    <article className="card">
      <div className="card-main">
        <div className="card-meta">
          <Link className="company" to={`/jobs?company=${encodeURIComponent(job.company)}`}>
            {job.company}
          </Link>
          {job.location && <span className="muted">{job.location}</span>}
        </div>
        <h3 className="card-title">
          <Link to={`/jobs/${job.id}`}>{job.title}</Link>
        </h3>
        <div className="card-foot">
          <span className="pill">{job.job_type}</span>
          <span className="pill">{job.work_mode}</span>
          <span className="pill">{job.experience}</span>
          {deadline && <span className={`deadline ${deadline.urgent ? "urgent" : ""} ${deadline.closed ? "closed" : ""}`}>{deadline.text}</span>}
          <span className="muted">
            posted by {job.author} · {timeAgo(job.created_at)}
          </span>
        </div>
      </div>
      <a className="btn primary" href={job.apply_url} target="_blank" rel="noopener noreferrer">
        Apply ↗
      </a>
    </article>
  );
}

/** A list of checkboxes for one fixed option list. */
export function CheckGroup({
  title,
  options,
  selected,
  counts,
  onChange,
}: {
  title: string;
  options: string[];
  selected: string[];
  counts?: Record<string, number>;
  onChange: (values: string[]) => void;
}) {
  return (
    <fieldset className="filter-group">
      <legend>
        {title}
        {selected.length > 0 && (
          <button type="button" className="link" onClick={() => onChange([])}>
            Clear
          </button>
        )}
      </legend>
      {options.map((option) => (
        <label key={option} className="check">
          <input
            type="checkbox"
            checked={selected.includes(option)}
            onChange={(e) => onChange(e.target.checked ? [...selected, option] : selected.filter((s) => s !== option))}
          />
          <span>{option}</span>
          {counts && <span className="count">{counts[option] ?? 0}</span>}
        </label>
      ))}
    </fieldset>
  );
}

export function Pagination({ page, total, pageSize, onPage }: { page: number; total: number; pageSize: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <nav className="pagination" aria-label="Pages">
      <button className="btn" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        ← Previous
      </button>
      <span className="muted">
        Page {page} of {pages}
      </span>
      <button className="btn" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        Next →
      </button>
    </nav>
  );
}

/** Free-text company field that suggests companies already on the site. */
export function CompanyInput({ value, onChange, placeholder, required }: { value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean }) {
  const listId = useId();
  const [companies, setCompanies] = useState<Company[]>([]);
  useEffect(() => {
    api.companies().then(setCompanies).catch(() => setCompanies([]));
  }, []);
  return (
    <>
      <input list={listId} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required} maxLength={80} />
      <datalist id={listId}>
        {companies.map((c) => (
          <option key={c.name} value={c.name} />
        ))}
      </datalist>
    </>
  );
}

export function ErrorNote({ error }: { error: string | null }) {
  return error ? (
    <p className="error" role="alert">
      {error}
    </p>
  ) : null;
}

/** Filter sidebar. On small screens it collapses behind a "Filters" button. */
export function FiltersPanel({ activeCount, children }: { activeCount: number; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="filters-wrap">
      <button className="btn filters-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
        {open ? "Hide filters" : "Filters"}
        {activeCount > 0 && <span className="filters-count">{activeCount}</span>}
      </button>
      <aside className={`filters ${open ? "open" : ""}`} aria-label="Filters">
        {children}
      </aside>
    </div>
  );
}
