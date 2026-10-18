import { Link, Navigate, NavLink, Route, Routes } from "react-router-dom";
import { useLoginRedirect } from "./components/ui";
import { useSession } from "./lib/session";
import { CompaniesPage } from "./pages/CompaniesPage";
import { JobDetailPage } from "./pages/JobDetailPage";
import { JobsPage } from "./pages/JobsPage";
import { LoginPage } from "./pages/LoginPage";
import { NewJobPage } from "./pages/NewJobPage";
import { NewQuestionPage } from "./pages/NewQuestionPage";
import { QuestionDetailPage } from "./pages/QuestionDetailPage";
import { QuestionsPage } from "./pages/QuestionsPage";

export default function App() {
  const { user, ready, meta, logout } = useSession();
  const toLogin = useLoginRedirect();

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <Link to="/" className="brand">
            <span className="logo" aria-hidden>
              IH
            </span>
            Interview Hub
          </Link>
          <nav className="nav">
            <NavLink to="/questions">Questions</NavLink>
            <NavLink to="/jobs">Jobs</NavLink>
            <NavLink to="/companies">Companies</NavLink>
          </nav>
          <div className="account">
            {ready &&
              (user ? (
                <>
                  <span className="muted">@{user.username}</span>
                  <button className="btn ghost" onClick={logout}>
                    Sign out
                  </button>
                </>
              ) : (
                <button className="btn" onClick={toLogin}>
                  Sign in
                </button>
              ))}
          </div>
        </div>
      </header>

      <main className="main">
        {ready && !meta ? (
          <div className="narrow">
            <p className="error">Can't reach the server. Is the backend running on port 8000?</p>
          </div>
        ) : (
          <Routes>
            <Route path="/" element={<Navigate to="/questions" replace />} />
            <Route path="/questions" element={<QuestionsPage />} />
            <Route path="/questions/new" element={<NewQuestionPage />} />
            <Route path="/questions/:id" element={<QuestionDetailPage />} />
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/jobs/new" element={<NewJobPage />} />
            <Route path="/jobs/:id" element={<JobDetailPage />} />
            <Route path="/companies" element={<CompaniesPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={<div className="narrow"><h1>Page not found</h1><Link to="/questions">Go to questions</Link></div>} />
          </Routes>
        )}
      </main>
    </div>
  );
}
