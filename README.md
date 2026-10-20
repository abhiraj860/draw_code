Here's the full topic map for designing production-grade multi-agent systems and RAG, grouped by layer. Each section builds on the ones before it.

1. LLM fundamentals
Tokens, tokenization, context windows, and their cost and latency impact
Sampling: temperature, top-p, max tokens, stop sequences
Model families and tradeoffs (frontier vs small/fast models, open vs closed)
Reasoning/extended-thinking models and when they're worth the cost
Multimodal inputs: images, PDFs, audio
Failure modes: hallucination, instruction drift, lost-in-the-middle, sycophancy
2. Prompt and context engineering
System prompts, role design, few-shot examples
Structuring prompts (XML tags, sections, explicit output formats)
Context engineering: deciding what goes into the context window, in what order, and what to leave out
Context compression: summarization, trimming history, rolling windows
Prompt versioning and prompt management
3. Structured outputs and tool use
JSON / schema-constrained outputs, validated with Pydantic
Tool (function) calling: schemas, descriptions, argument validation
Tool design principles: few, clear, well-named tools with good error messages
MCP (Model Context Protocol): standard way to expose tools and data to agents
Parallel tool calls, tool result handling, tool errors
4. RAG: ingestion pipeline
Document parsing: PDFs, tables, HTML, scanned docs (OCR), slides
Chunking strategies: fixed-size, recursive, semantic, structure-aware (headings), parent-child
Metadata extraction and enrichment (source, date, author, permissions)
Embeddings: model choice, dimensions, multilingual support, domain fit
Contextual chunk enrichment (prepending document context to each chunk)
Incremental indexing, re-indexing, deduplication, deletions
5. RAG: retrieval and generation
Vector databases: pgvector, Qdrant, Weaviate, Pinecone, Milvus; index types (HNSW, IVF)
Hybrid search: dense vectors + BM25/keyword, combined with reciprocal rank fusion
Reranking: cross-encoders, Cohere/Voyage rerankers
Query transformation: rewriting, decomposition, HyDE, multi-query
Metadata filtering and document-level access control
Citations and grounding: making answers point back to sources
Advanced patterns: agentic RAG (the agent decides when and what to retrieve), GraphRAG/knowledge graphs, multi-hop retrieval
Long context vs RAG: when to just put everything in the prompt
6. Single-agent design
The agent loop: model → tool call → observe → repeat → stop
Patterns: ReAct, plan-and-execute, reflection/self-critique
Stopping conditions, max-iteration limits, budgets
Memory: short-term (conversation), long-term (vector/DB), episodic, user profiles
Workflows vs agents: fixed code-driven pipelines vs model-driven control. Start with the simplest one that works.
7. Multi-agent systems
When multi-agent actually helps (parallelism, separation of concerns, context isolation) and when it just adds cost and failure points
Architectures:
Orchestrator–worker (a lead agent hands subtasks to subagents)
Supervisor / hierarchical teams
Handoffs / routing (triage agent → specialist agent)
Parallel fan-out + aggregation
Evaluator–optimizer (generator + critic loop)
Sequential pipelines / prompt chaining
Shared state vs message passing; what context each agent receives
Agent-to-agent protocols (A2A)
Coordination failures: loops, duplicated work, conflicting outputs, error cascades
8. Orchestration frameworks and runtimes
LangGraph (graph/state-machine agents), Claude Agent SDK, OpenAI Agents SDK, CrewAI, LlamaIndex, Pydantic AI
Durable execution: Temporal, checkpointing, resuming long-running agents after crashes
Know how to build an agent loop without a framework, so you understand what the frameworks do for you
9. Evaluation ⭐ (what separates demos from production)
Golden datasets and test sets built from real user queries
Retrieval metrics: recall@k, precision@k, MRR, nDCG
Generation metrics: faithfulness/groundedness, answer relevance, correctness (RAGAS, DeepEval)
LLM-as-judge: rubric design, calibrating against human labels
Agent evals: task success rate, trajectory/tool-call correctness, steps and cost per task
Regression testing in CI: run evals on every prompt or model change
Online evals: user feedback, A/B tests, production sampling
10. Observability
Tracing every LLM call, tool call, and retrieval step (Langfuse, LangSmith, Arize Phoenix, OpenTelemetry)
Metrics: latency (time to first token, total), tokens, cost, error rates, per-agent breakdown
Logging prompts and outputs (with PII handling)
Debugging multi-agent traces, replaying failed runs
11. Reliability
Retries with exponential backoff, timeouts, circuit breakers
Model fallbacks (primary → backup model or provider)
Rate-limit handling and request queuing
Idempotent tool calls (no double-charging or double-sending on retry)
Human-in-the-loop: approval gates for risky actions, escalation paths
Graceful degradation when retrieval or tools fail
12. Performance and cost
Prompt caching (provider-level) and semantic caching (similar queries)
Model routing: cheap models for easy tasks, strong models for hard ones
Batch APIs for offline workloads
Streaming to improve perceived latency
Token budgets per request, per user, and per agent
Parallelizing independent calls
13. Security and safety
Prompt injection (direct, and indirect through retrieved docs, web pages, and tool outputs)
Least-privilege tools, sandboxed code execution, egress controls
Data leakage across users and tenants; permission-aware retrieval
PII detection and redaction, data retention policies
Guardrails: input and output filtering, content moderation, schema enforcement
Secrets management, audit logs
Compliance basics: GDPR, SOC 2, data residency
14. Backend and system design foundations
API design: REST, streaming (SSE), WebSockets; FastAPI
Async programming and concurrency
Queues and workers: Celery, Redis/RQ, Kafka, SQS for long-running agent jobs
Event-driven architecture
Databases: Postgres, Redis, object storage (S3)
Multi-tenancy design
Horizontal scaling, load balancing, stateless services
15. LLMOps and deployment
Docker, Kubernetes basics, CI/CD
Prompt, model, and index versioning; safe rollouts and rollbacks
Self-hosting models: vLLM, TGI, Ollama, quantization, GPU sizing
Environment management (dev/staging/prod), feature flags
16. Model adaptation (know when to use it)
Prompting vs RAG vs fine-tuning: a decision framework
Fine-tuning basics: LoRA/PEFT, dataset preparation, distillation to smaller models
Embedding fine-tuning for domain retrieval
17. Product and UX
Streaming UIs, showing agent progress and intermediate steps
Showing citations and confidence; clarifying questions
Feedback capture (thumbs up/down, corrections) that feeds back into evals
Setting user expectations about what the AI can and can't do
Learning order
Foundations: sections 1–3, 14 (LLMs, prompting, tools, backend)
RAG: sections 4–5, then 9 (build it, then learn to measure it)
Agents: sections 6, 8, then 7 (single agent first, multi-agent last)
Production: sections 10–13, 15 (observability, reliability, cost, security, deployment)
Specialization: section 16 and advanced RAG/multi-agent patterns, as needed
Two principles experienced engineers repeat: start simple (a workflow before an agent, one agent before many), and evals first. Without measurement, you can't tell whether a change made the system better.