# Progress

**Current topic:** 1.2
**Completed:** 1/96

Format when done: `- [x] X.Y Topic — YYYY-MM-DD — what I built`

## 1. LLM fundamentals
- [x] 1.1 Tokens, tokenization, context windows, and their cost and latency impact — 2026-10-21 — measured token counts per text type; built cost_usd/fits/monthly_cost; saw finish_reason=length + latency scaling with output
- [ ] 1.2 Sampling: temperature, top-p, max tokens, stop sequences
- [ ] 1.3 Model families and tradeoffs (frontier vs small/fast models, open vs closed)
- [ ] 1.4 Reasoning/extended-thinking models and when they're worth the cost
- [ ] 1.5 Multimodal inputs: images, PDFs, audio
- [ ] 1.6 Failure modes: hallucination, instruction drift, lost-in-the-middle, sycophancy

## 2. Prompt and context engineering
- [ ] 2.1 System prompts, role design, few-shot examples
- [ ] 2.2 Structuring prompts (XML tags, sections, explicit output formats)
- [ ] 2.3 Context engineering: deciding what goes into the context window, in what order, and what to leave out
- [ ] 2.4 Context compression: summarization, trimming history, rolling windows
- [ ] 2.5 Prompt versioning and prompt management

## 3. Structured outputs and tool use
- [ ] 3.1 JSON / schema-constrained outputs, validated with Pydantic
- [ ] 3.2 Tool (function) calling: schemas, descriptions, argument validation
- [ ] 3.3 Tool design principles: few, clear, well-named tools with good error messages
- [ ] 3.4 MCP (Model Context Protocol): standard way to expose tools and data to agents
- [ ] 3.5 Parallel tool calls, tool result handling, tool errors

## 4. RAG: ingestion pipeline
- [ ] 4.1 Document parsing: PDFs, tables, HTML, scanned docs (OCR), slides
- [ ] 4.2 Chunking strategies: fixed-size, recursive, semantic, structure-aware (headings), parent-child
- [ ] 4.3 Metadata extraction and enrichment (source, date, author, permissions)
- [ ] 4.4 Embeddings: model choice, dimensions, multilingual support, domain fit
- [ ] 4.5 Contextual chunk enrichment (prepending document context to each chunk)
- [ ] 4.6 Incremental indexing, re-indexing, deduplication, deletions

## 5. RAG: retrieval and generation
- [ ] 5.1 Vector databases: pgvector, Qdrant, Weaviate, Pinecone, Milvus; index types (HNSW, IVF)
- [ ] 5.2 Hybrid search: dense vectors + BM25/keyword, combined with reciprocal rank fusion
- [ ] 5.3 Reranking: cross-encoders, Cohere/Voyage rerankers
- [ ] 5.4 Query transformation: rewriting, decomposition, HyDE, multi-query
- [ ] 5.5 Metadata filtering and document-level access control
- [ ] 5.6 Citations and grounding: making answers point back to sources
- [ ] 5.7 Advanced patterns: agentic RAG, GraphRAG/knowledge graphs, multi-hop retrieval
- [ ] 5.8 Long context vs RAG: when to just put everything in the prompt

## 6. Single-agent design
- [ ] 6.1 The agent loop: model → tool call → observe → repeat → stop
- [ ] 6.2 Patterns: ReAct, plan-and-execute, reflection/self-critique
- [ ] 6.3 Stopping conditions, max-iteration limits, budgets
- [ ] 6.4 Memory: short-term (conversation), long-term (vector/DB), episodic, user profiles
- [ ] 6.5 Workflows vs agents: fixed code-driven pipelines vs model-driven control

## 7. Multi-agent systems
- [ ] 7.1 When multi-agent actually helps and when it just adds cost and failure points
- [ ] 7.2 Architectures: Orchestrator–worker
- [ ] 7.3 Architectures: Supervisor / hierarchical teams
- [ ] 7.4 Architectures: Handoffs / routing (triage → specialist)
- [ ] 7.5 Architectures: Parallel fan-out + aggregation
- [ ] 7.6 Architectures: Evaluator–optimizer (generator + critic loop)
- [ ] 7.7 Architectures: Sequential pipelines / prompt chaining
- [ ] 7.8 Shared state vs message passing; what context each agent receives
- [ ] 7.9 Agent-to-agent protocols (A2A)
- [ ] 7.10 Coordination failures: loops, duplicated work, conflicting outputs, error cascades

## 8. Orchestration frameworks and runtimes
- [ ] 8.1 LangGraph, Claude Agent SDK, OpenAI Agents SDK, CrewAI, LlamaIndex, Pydantic AI
- [ ] 8.2 Durable execution: Temporal, checkpointing, resuming long-running agents after crashes
- [ ] 8.3 Build an agent loop without a framework, to understand what frameworks do

## 9. Evaluation
- [ ] 9.1 Golden datasets and test sets built from real user queries
- [ ] 9.2 Retrieval metrics: recall@k, precision@k, MRR, nDCG
- [ ] 9.3 Generation metrics: faithfulness/groundedness, answer relevance, correctness (RAGAS, DeepEval)
- [ ] 9.4 LLM-as-judge: rubric design, calibrating against human labels
- [ ] 9.5 Agent evals: task success rate, trajectory/tool-call correctness, steps and cost per task
- [ ] 9.6 Regression testing in CI: run evals on every prompt or model change
- [ ] 9.7 Online evals: user feedback, A/B tests, production sampling

## 10. Observability
- [ ] 10.1 Tracing every LLM call, tool call, and retrieval step (Langfuse, OpenTelemetry, ...)
- [ ] 10.2 Metrics: latency (TTFT, total), tokens, cost, error rates, per-agent breakdown
- [ ] 10.3 Logging prompts and outputs (with PII handling)
- [ ] 10.4 Debugging multi-agent traces, replaying failed runs

## 11. Reliability
- [ ] 11.1 Retries with exponential backoff, timeouts, circuit breakers
- [ ] 11.2 Model fallbacks (primary → backup model or provider)
- [ ] 11.3 Rate-limit handling and request queuing
- [ ] 11.4 Idempotent tool calls (no double-charging or double-sending on retry)
- [ ] 11.5 Human-in-the-loop: approval gates for risky actions, escalation paths
- [ ] 11.6 Graceful degradation when retrieval or tools fail

## 12. Performance and cost
- [ ] 12.1 Prompt caching (provider-level) and semantic caching (similar queries)
- [ ] 12.2 Model routing: cheap models for easy tasks, strong models for hard ones
- [ ] 12.3 Batch APIs for offline workloads
- [ ] 12.4 Streaming to improve perceived latency
- [ ] 12.5 Token budgets per request, per user, and per agent
- [ ] 12.6 Parallelizing independent calls

## 13. Security and safety
- [ ] 13.1 Prompt injection (direct, and indirect through retrieved docs, web pages, tool outputs)
- [ ] 13.2 Least-privilege tools, sandboxed code execution, egress controls
- [ ] 13.3 Data leakage across users and tenants; permission-aware retrieval
- [ ] 13.4 PII detection and redaction, data retention policies
- [ ] 13.5 Guardrails: input and output filtering, content moderation, schema enforcement
- [ ] 13.6 Secrets management, audit logs
- [ ] 13.7 Compliance basics: GDPR, SOC 2, data residency

## 14. Backend and system design foundations
- [ ] 14.1 API design: REST, streaming (SSE), WebSockets; FastAPI
- [ ] 14.2 Async programming and concurrency
- [ ] 14.3 Queues and workers: Celery, Redis/RQ, Kafka, SQS for long-running agent jobs
- [ ] 14.4 Event-driven architecture
- [ ] 14.5 Databases: Postgres, Redis, object storage (S3)
- [ ] 14.6 Multi-tenancy design
- [ ] 14.7 Horizontal scaling, load balancing, stateless services

## 15. LLMOps and deployment
- [ ] 15.1 Docker, Kubernetes basics, CI/CD
- [ ] 15.2 Prompt, model, and index versioning; safe rollouts and rollbacks
- [ ] 15.3 Self-hosting models: vLLM, TGI, Ollama, quantization, GPU sizing
- [ ] 15.4 Environment management (dev/staging/prod), feature flags

## 16. Model adaptation
- [ ] 16.1 Prompting vs RAG vs fine-tuning: a decision framework
- [ ] 16.2 Fine-tuning basics: LoRA/PEFT, dataset preparation, distillation to smaller models
- [ ] 16.3 Embedding fine-tuning for domain retrieval

## 17. Product and UX
- [ ] 17.1 Streaming UIs, showing agent progress and intermediate steps
- [ ] 17.2 Showing citations and confidence; clarifying questions
- [ ] 17.3 Feedback capture (thumbs up/down, corrections) that feeds back into evals
- [ ] 17.4 Setting user expectations about what the AI can and can't do

# Project

Milestone after the last topic of each section (`check` to review, `next` to skip).

- [ ] M1 LLM fundamentals
- [ ] M2 Prompt and context engineering
- [ ] M3 Structured outputs and tool use
- [ ] M4 RAG: ingestion pipeline
- [ ] M5 RAG: retrieval and generation
- [ ] M6 Single-agent design
- [ ] M7 Multi-agent systems
- [ ] M8 Orchestration frameworks and runtimes
- [ ] M9 Evaluation
- [ ] M10 Observability
- [ ] M11 Reliability
- [ ] M12 Performance and cost
- [ ] M13 Security and safety
- [ ] M14 Backend and system design foundations
- [ ] M15 LLMOps and deployment
- [ ] M16 Model adaptation
- [ ] M17 Product and UX
