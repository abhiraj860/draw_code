import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { CompanyInput, ErrorNote } from "../components/ui";
import { api } from "../lib/api";
import { useSession } from "../lib/session";

export function NewJobPage() {
  const { user, meta, ready } = useSession();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    company: "",
    location: "",
    job_type: "Full-time",
    work_mode: "On-site",
    experience: "New Grad",
    apply_url: "",
    description: "",
    deadline: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<typeof form>) => setForm({ ...form, ...patch });

  if (ready && !user) return <Navigate to="/login?next=/jobs/new" replace />;
  if (!meta) return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const job = await api.createJob(form);
      navigate(`/jobs/${job.id}`);
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  };

  const select = (key: "job_type" | "work_mode" | "experience", label: string, options: string[]) => (
    <label className="field">
      <span>{label} *</span>
      <select value={form[key]} onChange={(e) => set({ [key]: e.target.value })}>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </label>
  );

  return (
    <form className="narrow form" onSubmit={submit}>
      <h1>Post a job</h1>
      <p className="muted">Share an opening with other students. Link to the official application page.</p>

      <div className="row">
        <label className="field">
          <span>Job title *</span>
          <input value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Software Engineer Intern" required minLength={3} maxLength={120} />
        </label>
        <label className="field">
          <span>Company *</span>
          <CompanyInput value={form.company} onChange={(company) => set({ company })} placeholder="e.g. Acme Corp" required />
        </label>
      </div>

      <div className="row three">
        {select("job_type", "Type", meta.job_types)}
        {select("work_mode", "Work mode", meta.work_modes)}
        {select("experience", "Experience", meta.experience_levels)}
      </div>

      <div className="row">
        <label className="field">
          <span>Location</span>
          <input value={form.location} onChange={(e) => set({ location: e.target.value })} placeholder="e.g. Bangalore, India" maxLength={120} />
        </label>
        <label className="field">
          <span>Application deadline</span>
          <input type="date" value={form.deadline} onChange={(e) => set({ deadline: e.target.value })} />
        </label>
      </div>

      <label className="field">
        <span>Apply link *</span>
        <input type="url" value={form.apply_url} onChange={(e) => set({ apply_url: e.target.value })} placeholder="https://…" required pattern="https?://.+" />
      </label>

      <label className="field">
        <span>Description</span>
        <textarea value={form.description} onChange={(e) => set({ description: e.target.value })} rows={7} maxLength={10000} placeholder="Responsibilities, requirements, eligibility, stipend…" />
      </label>

      <ErrorNote error={error} />
      <div className="form-actions">
        <button className="btn primary" disabled={saving}>
          {saving ? "Posting…" : "Post job"}
        </button>
        <button type="button" className="btn ghost" onClick={() => navigate(-1)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
