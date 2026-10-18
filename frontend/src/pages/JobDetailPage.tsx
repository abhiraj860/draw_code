import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ErrorNote } from "../components/ui";
import { api, type Job } from "../lib/api";
import { deadlineLabel, timeAgo } from "../lib/format";

export function JobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .job(Number(id))
      .then(setJob)
      .catch((e) => setError(e.message));
  }, [id]);

  const remove = async () => {
    if (!job || !confirm("Delete this job post?")) return;
    try {
      await api.deleteJob(job.id);
      navigate("/jobs");
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (error) return <div className="narrow"><ErrorNote error={error} /></div>;
  if (!job) return null;
  const deadline = deadlineLabel(job.deadline);

  return (
    <article className="narrow detail">
      <Link className="back" to="/jobs">
        ← All jobs
      </Link>
      <div className="card-meta">
        <Link className="company" to={`/jobs?company=${encodeURIComponent(job.company)}`}>
          {job.company}
        </Link>
        {job.location && <span className="muted">{job.location}</span>}
      </div>
      <h1>{job.title}</h1>

      <dl className="facts">
        <div>
          <dt>Type</dt>
          <dd>{job.job_type}</dd>
        </div>
        <div>
          <dt>Work mode</dt>
          <dd>{job.work_mode}</dd>
        </div>
        <div>
          <dt>Experience</dt>
          <dd>{job.experience}</dd>
        </div>
        {deadline && (
          <div>
            <dt>Deadline</dt>
            <dd className={deadline.urgent ? "urgent" : ""}>
              {job.deadline} ({deadline.text.toLowerCase()})
            </dd>
          </div>
        )}
        <div>
          <dt>Posted by</dt>
          <dd>
            {job.author}, {timeAgo(job.created_at)}
          </dd>
        </div>
      </dl>

      {job.description && <div className="body">{job.description}</div>}

      <div className="detail-actions">
        <a className="btn primary" href={job.apply_url} target="_blank" rel="noopener noreferrer">
          Apply ↗
        </a>
        <Link className="btn" to={`/questions?company=${encodeURIComponent(job.company)}`}>
          Prepare: {job.company} interview questions
        </Link>
        {job.mine && (
          <button className="btn danger" onClick={remove}>
            Delete
          </button>
        )}
      </div>
    </article>
  );
}
