import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { CompanyInput, ErrorNote } from "../components/ui";
import { api } from "../lib/api";
import { categoryClass } from "../lib/format";
import { useSession } from "../lib/session";

export function NewQuestionPage() {
  const { user, meta, ready } = useSession();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    body: "",
    company: "",
    category: "",
    difficulty: "Medium",
    round: "Technical Interview",
    role: "",
    asked_on: "",
    tags: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<typeof form>) => setForm({ ...form, ...patch });

  if (ready && !user) return <Navigate to="/login?next=/questions/new" replace />;
  if (!meta) return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.category) return setError("Pick a category.");
    setSaving(true);
    setError(null);
    try {
      const q = await api.createQuestion({
        ...form,
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });
      navigate(`/questions/${q.id}`);
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  };

  return (
    <form className="narrow form" onSubmit={submit}>
      <h1>Share an interview question</h1>
      <p className="muted">Help other students prepare. Share the question as it was asked; leave out anything confidential.</p>

      <label className="field">
        <span>Company *</span>
        <CompanyInput value={form.company} onChange={(company) => set({ company })} placeholder="e.g. Acme Corp" required />
      </label>

      <fieldset className="field">
        <legend>Category *</legend>
        <div className="category-picker">
          {meta.categories.map((c) => (
            <label key={c.name} className={`category-option ${form.category === c.name ? "on" : ""}`}>
              <input type="radio" name="category" value={c.name} checked={form.category === c.name} onChange={() => set({ category: c.name })} required />
              <span className={`badge ${categoryClass(c.name)}`}>{c.name}</span>
              <span className="muted small">{c.description}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="field">
        <span>Question title *</span>
        <input value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Design a rate limiter" required minLength={5} maxLength={200} />
      </label>

      <label className="field">
        <span>Details *</span>
        <textarea
          value={form.body}
          onChange={(e) => set({ body: e.target.value })}
          rows={8}
          required
          minLength={10}
          maxLength={10000}
          placeholder="The full question, constraints, follow-ups the interviewer asked, and any hints you got."
        />
      </label>

      <div className="row">
        <label className="field">
          <span>Difficulty *</span>
          <select value={form.difficulty} onChange={(e) => set({ difficulty: e.target.value })}>
            {meta.difficulties.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Round *</span>
          <select value={form.round} onChange={(e) => set({ round: e.target.value })}>
            {meta.rounds.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="row">
        <label className="field">
          <span>Role</span>
          <input value={form.role} onChange={(e) => set({ role: e.target.value })} placeholder="e.g. SDE Intern" maxLength={80} />
        </label>
        <label className="field">
          <span>When were you asked?</span>
          <input type="month" value={form.asked_on} onChange={(e) => set({ asked_on: e.target.value })} />
        </label>
      </div>

      <label className="field">
        <span>Topic tags</span>
        <input value={form.tags} onChange={(e) => set({ tags: e.target.value })} placeholder="Comma separated, e.g. graphs, bfs, caching (up to 8)" />
      </label>

      <ErrorNote error={error} />
      <div className="form-actions">
        <button className="btn primary" disabled={saving}>
          {saving ? "Posting…" : "Post question"}
        </button>
        <button type="button" className="btn ghost" onClick={() => navigate(-1)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
