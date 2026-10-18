import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AskedButton, CategoryBadge, DifficultyPill, ErrorNote } from "../components/ui";
import { api, type Question } from "../lib/api";
import { monthLabel, timeAgo } from "../lib/format";

export function QuestionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [question, setQuestion] = useState<Question | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .question(Number(id))
      .then(setQuestion)
      .catch((e) => setError(e.message));
  }, [id]);

  const remove = async () => {
    if (!question || !confirm("Delete this question? This cannot be undone.")) return;
    try {
      await api.deleteQuestion(question.id);
      navigate("/questions");
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (error) return <div className="narrow"><ErrorNote error={error} /></div>;
  if (!question) return null;

  return (
    <article className="narrow detail">
      <Link className="back" to="/questions">
        ← All questions
      </Link>
      <div className="card-meta">
        <Link className="company" to={`/questions?company=${encodeURIComponent(question.company)}`}>
          {question.company}
        </Link>
        <CategoryBadge category={question.category} />
        <DifficultyPill difficulty={question.difficulty} />
      </div>
      <h1>{question.title}</h1>

      <dl className="facts">
        <div>
          <dt>Round</dt>
          <dd>{question.round}</dd>
        </div>
        {question.role && (
          <div>
            <dt>Role</dt>
            <dd>{question.role}</dd>
          </div>
        )}
        {question.asked_on && (
          <div>
            <dt>Asked</dt>
            <dd>{monthLabel(question.asked_on)}</dd>
          </div>
        )}
        <div>
          <dt>Shared by</dt>
          <dd>
            {question.author}, {timeAgo(question.created_at)}
          </dd>
        </div>
      </dl>

      <div className="body">{question.body}</div>

      {question.tags.length > 0 && (
        <div className="tags">
          {question.tags.map((t) => (
            <Link key={t} className="tag" to={`/questions?q=${encodeURIComponent(t)}`}>
              #{t}
            </Link>
          ))}
        </div>
      )}

      <div className="detail-actions">
        <AskedButton question={question} onChange={setQuestion} />
        <Link className="btn" to={`/questions?company=${encodeURIComponent(question.company)}`}>
          More from {question.company}
        </Link>
        <Link className="btn" to={`/jobs?company=${encodeURIComponent(question.company)}`}>
          Jobs at {question.company}
        </Link>
        {question.mine && (
          <button className="btn danger" onClick={remove}>
            Delete
          </button>
        )}
      </div>
    </article>
  );
}
