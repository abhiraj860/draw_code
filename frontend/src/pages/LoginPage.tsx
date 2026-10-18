import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ErrorNote } from "../components/ui";
import { api } from "../lib/api";
import { useSession } from "../lib/session";

export function LoginPage() {
  const { setUser } = useSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next")?.startsWith("/") ? params.get("next")! : "/questions";
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = mode === "login" ? await api.login(username, password) : await api.signup(username, password);
      setUser(user);
      navigate(next, { replace: true });
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <form className="auth-card form" onSubmit={submit}>
      <h1>{mode === "login" ? "Sign in" : "Create an account"}</h1>
      <p className="muted">{mode === "login" ? "Welcome back." : "Free, and takes ten seconds. No email needed."}</p>
      <label className="field">
        <span>Username</span>
        <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required minLength={3} maxLength={30} pattern="[A-Za-z0-9_.\-]+" title="Letters, numbers, dots, dashes and underscores" />
      </label>
      <label className="field">
        <span>Password</span>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={8} />
        {mode === "signup" && <small className="muted">At least 8 characters.</small>}
      </label>
      <ErrorNote error={error} />
      <button className="btn primary block" disabled={busy}>
        {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
      </button>
      <p className="switch muted">
        {mode === "login" ? "New here?" : "Already have an account?"}{" "}
        <button
          type="button"
          className="link"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError(null);
          }}
        >
          {mode === "login" ? "Create an account" : "Sign in"}
        </button>
      </p>
    </form>
  );
}
