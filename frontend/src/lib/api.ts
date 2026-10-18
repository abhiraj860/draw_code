export type User = { id: number; username: string };

export type Meta = {
  categories: { name: string; description: string }[];
  difficulties: string[];
  rounds: string[];
  job_types: string[];
  work_modes: string[];
  experience_levels: string[];
};

export type Question = {
  id: number;
  title: string;
  body: string;
  company: string;
  category: string;
  difficulty: string;
  round: string;
  role: string;
  asked_on: string;
  tags: string[];
  author: string;
  created_at: string;
  asked_count: number;
  asked_by_me: boolean;
  mine: boolean;
};

export type Job = {
  id: number;
  title: string;
  company: string;
  location: string;
  job_type: string;
  work_mode: string;
  experience: string;
  apply_url: string;
  description: string;
  deadline: string;
  author: string;
  created_at: string;
  mine: boolean;
};

export type Page<T> = { items: T[]; total: number; page: number; page_size: number };
export type QuestionPage = Page<Question> & { category_counts: Record<string, number> };
export type JobBatch = { items: Job[]; total: number; next_before: number | null };
export type Company = { name: string; question_count: number; job_count: number };

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

type Params = Record<string, string | number | boolean | string[] | undefined>;

export function queryString(params: Params): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "" || value === false) continue;
    for (const v of Array.isArray(value) ? value : [value]) qs.append(key, String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (typeof data.detail === "string") message = data.detail;
      else if (Array.isArray(data.detail)) {
        // FastAPI validation errors: [{loc: [..., "field"], msg}]
        message = data.detail.map((e: { loc: string[]; msg: string }) => `${e.loc.at(-1)}: ${e.msg}`).join("; ");
      }
    } catch {
      // Not JSON; keep the generic message.
    }
    throw new ApiError(res.status, message);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

export const api = {
  meta: () => request<Meta>("GET", "/meta"),
  me: () => request<User | null>("GET", "/auth/me"),
  login: (username: string, password: string) => request<User>("POST", "/auth/login", { username, password }),
  signup: (username: string, password: string) => request<User>("POST", "/auth/signup", { username, password }),
  logout: () => request<void>("POST", "/auth/logout"),

  companies: (q = "") => request<Company[]>("GET", `/companies${queryString({ q })}`),

  questions: (params: Params) => request<QuestionPage>("GET", `/questions${queryString(params)}`),
  question: (id: number) => request<Question>("GET", `/questions/${id}`),
  createQuestion: (body: Omit<Question, "id" | "author" | "created_at" | "asked_count" | "asked_by_me" | "mine">) =>
    request<Question>("POST", "/questions", body),
  toggleAsked: (id: number) => request<{ asked_count: number; asked_by_me: boolean }>("POST", `/questions/${id}/asked`),
  deleteQuestion: (id: number) => request<void>("DELETE", `/questions/${id}`),

  jobs: (params: Params) => request<JobBatch>("GET", `/jobs${queryString(params)}`),
  job: (id: number) => request<Job>("GET", `/jobs/${id}`),
  createJob: (body: Omit<Job, "id" | "author" | "created_at" | "mine">) => request<Job>("POST", "/jobs", body),
  deleteJob: (id: number) => request<void>("DELETE", `/jobs/${id}`),
};
