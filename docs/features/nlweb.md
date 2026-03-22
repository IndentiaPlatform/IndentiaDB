# Natural Language Query (NLWeb)

NLWeb is a conversational AI query layer that sits in front of IndentiaDB and lets users ask questions in plain language. Instead of writing SPARQL or SurrealQL, a user types "Which entities are related to climate change?" and receives a ranked, cited answer synthesized from IndentiaDB's knowledge graph, document store, and full-text index.

NLWeb is an open protocol and reference implementation originally developed by Microsoft. IndentiaDB ships a pre-configured NLWeb stack that wires the protocol directly to its multi-model query router.

!!! tip "When to use NLWeb"
    NLWeb is the right interface when your audience cannot write formal query languages — business analysts, domain experts, or end users. For programmatic access or high-throughput workloads, use SPARQL, SurrealQL, or the Elasticsearch-compatible API directly.

---

## Architecture

```
User
  │
  │  natural language question
  ▼
┌─────────────────────────────────────────────┐
│               NLWeb Server                  │
│  ┌──────────────┐    ┌────────────────────┐ │
│  │  Embedding   │    │   LLM (Claude)     │ │
│  │  (OpenAI)    │    │  Sonnet — complex  │ │
│  │  text-emb-   │    │  Haiku  — simple   │ │
│  │  3-small     │    └────────────────────┘ │
│  └──────┬───────┘             ▲             │
│         │ vector              │ rank + synth │
│         ▼                     │             │
│  ┌──────────────┐    ┌────────┴───────────┐ │
│  │   Qdrant     │───▶│  Retrieved chunks  │ │
│  │  vector DB   │    │  (Schema.org JSONL)│ │
│  └──────────────┘    └────────────────────┘ │
└─────────────────────────────────────────────┘
  │
  │  streaming JSON (SSE)
  ▼
Frontend widget  /  MCP client  /  REST caller
```

**Query flow:**

1. User question → NLWeb embeds it with `text-embedding-3-small`
2. Semantic search against Qdrant finds the top-k relevant document chunks
3. Claude scores and re-ranks the chunks (`high_model` for complex queries, `low_model` for simple)
4. Claude synthesizes a cited answer and streams it back via SSE
5. The frontend widget renders Markdown with source links

The document chunks in Qdrant are produced by an ingestion pipeline that converts IndentiaDB's content (or any MkDocs-based documentation) to Schema.org `TechArticle` JSONL and pushes it to the NLWeb ingest endpoint.

---

## Configuration

NLWeb is configured through four YAML files mounted as a ConfigMap in Kubernetes.

### LLM (`config_llm.yaml`)

```yaml
preferred_endpoint: anthropic

endpoints:
  anthropic:
    api_key_env: ANTHROPIC_API_KEY
    high_model: claude-sonnet-4-5-20250929   # complex ranking and synthesis
    low_model:  claude-haiku-4-5-20251001    # fast simple queries

  # Optional: local vLLM fallback on OKD
  openai_compatible:
    api_key_env:  VLLM_API_KEY
    endpoint_env: VLLM_ENDPOINT              # http://vllm.vllm.svc:8000/v1
    high_model: default
    low_model:  default
```

Switch to the local vLLM endpoint by changing `preferred_endpoint: openai_compatible`. No other changes are required.

### Embeddings (`config_embedding.yaml`)

```yaml
preferred_endpoint: openai

endpoints:
  openai:
    api_key_env:  OPENAI_API_KEY
    endpoint_env: OPENAI_ENDPOINT            # https://api.openai.com/v1
    model: text-embedding-3-small
```

!!! note "Why a separate embedding provider?"
    Anthropic does not expose a public embedding API. NLWeb uses OpenAI `text-embedding-3-small` for vectorisation while Claude handles all ranking and synthesis. The two providers are independently configurable.

### Vector database (`config_retrieval.yaml`)

```yaml
write_endpoint: qdrant_url

endpoints:
  qdrant_url:
    enabled:      true
    endpoint_env: QDRANT_URL                 # http://nlweb-qdrant.<ns>.svc:6333
    api_key_env:  QDRANT_API_KEY             # optional — omit on internal cluster
    index_name:   indentia_docs
    db_type:      qdrant

  # Local development fallback
  qdrant_local:
    enabled:       false
    database_path: "../data/qdrant"
    index_name:    indentia_docs
    db_type:       qdrant
```

### Webserver (`config_webserver.yaml`)

```yaml
host: "0.0.0.0"
port: 8000

cors_origins:
  - "https://docs.indentia.ai"
  - "http://localhost:8000"
```

Add your own origin to `cors_origins` if you embed the widget on a different domain.

---

## Frontend widget

Add the lightweight JavaScript widget to any HTML page:

```html
<!-- load the widget -->
<script src="/javascripts/nlweb-widget.js"></script>

<!-- mount point -->
<div id="ai-search-container"
     data-nlweb-endpoint="https://nlweb.example.com/api/v1/answer"
     data-lang="en">
</div>
```

The widget provides:

- A floating search box with chat history
- Real-time streaming via SSE (`item_details`, `result_batch` events)
- Markdown rendering with source attribution
- Collapsible chat panel

No framework dependency — a single vanilla JS file.

---

## REST API

NLWeb exposes a simple REST endpoint that any HTTP client can call directly.

```bash
curl -N -X POST https://nlweb.example.com/api/v1/answer \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What query languages does IndentiaDB support?",
    "num_results": 5
  }'
```

Response streams as Server-Sent Events:

```
data: {"type": "result_batch", "results": [
  {"score": 92, "url": "/query-languages/", "description": "SPARQL 1.2, SurrealQL, LPG, and hybrid queries..."},
  ...
]}

data: {"type": "item_details", "answer": "IndentiaDB supports four query languages: ..."}
```

| Field | Type | Description |
|-------|------|-------------|
| `query` | string | Natural language question |
| `num_results` | int | Top-k chunks to retrieve (default: 5) |
| `context_url` | string | Optional — scope search to a specific page subtree |

---

## MCP integration

NLWeb exposes a Model Context Protocol endpoint at `/mcp`. This lets Claude Code agents and other MCP clients query the knowledge base directly without a browser.

Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "indentia-docs": {
      "command": "python",
      "args": [
        "/path/to/NLWeb/code/chatbot_interface.py",
        "--server",   "https://nlweb.example.com",
        "--endpoint", "/mcp"
      ],
      "cwd": "/path/to/NLWeb/code",
      "env": {}
    }
  }
}
```

After adding this, Claude Code can answer questions about any content indexed in NLWeb without leaving the terminal.

---

## Data ingestion

NLWeb indexes content in Schema.org `TechArticle` JSONL format. The ingestion pipeline converts MkDocs Markdown files to this format and pushes them to the NLWeb ingest endpoint.

**Ingest a documentation site:**

```bash
# export mode: generate JSONL file for inspection
python nlweb_ingest.py \
  --docs-dir ./docs \
  --base-url https://docs.example.com \
  --mode export \
  --output indentia_docs.jsonl

# api mode: push directly to NLWeb
python nlweb_ingest.py \
  --docs-dir ./docs \
  --base-url https://docs.example.com \
  --mode api \
  --endpoint https://nlweb.example.com/api/v1/ingest \
  --incremental          # only re-ingest changed files
```

Each Markdown file becomes one JSONL record:

```json
{
  "@type":       "TechArticle",
  "@id":         "https://docs.example.com/features/nlweb/",
  "name":        "Natural Language Query (NLWeb)",
  "description": "NLWeb is a conversational AI query layer ...",
  "keywords":    ["NLWeb", "Architecture", "Configuration", "MCP integration"],
  "inLanguage":  "en",
  "url":         "https://docs.example.com/features/nlweb/"
}
```

State is tracked in `.nlweb-ingest-state.json` (SHA-256 hashes per file) so only modified pages are re-embedded on subsequent runs.

---

## Kubernetes deployment

NLWeb requires two pods: the NLWeb server and a Qdrant vector database.

```yaml
# nlweb-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nlweb
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nlweb
  template:
    metadata:
      labels:
        app: nlweb
    spec:
      containers:
        - name: nlweb
          image: iunera/nlweb:latest
          ports:
            - containerPort: 8000
          env:
            - name: ANTHROPIC_API_KEY
              valueFrom:
                secretKeyRef:
                  name: nlweb-secrets
                  key: anthropic-api-key
            - name: OPENAI_API_KEY
              valueFrom:
                secretKeyRef:
                  name: nlweb-secrets
                  key: openai-api-key
            - name: QDRANT_URL
              value: "http://nlweb-qdrant.<namespace>.svc:6333"
          resources:
            requests:
              memory: "256Mi"
              cpu: "100m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          volumeMounts:
            - name: nlweb-config
              mountPath: /app/config
      volumes:
        - name: nlweb-config
          configMap:
            name: nlweb-config
---
# qdrant-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nlweb-qdrant
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nlweb-qdrant
  template:
    metadata:
      labels:
        app: nlweb-qdrant
    spec:
      containers:
        - name: qdrant
          image: qdrant/qdrant:latest
          ports:
            - containerPort: 6333   # HTTP
            - containerPort: 6334   # gRPC
          volumeMounts:
            - name: qdrant-storage
              mountPath: /qdrant/storage
      volumes:
        - name: qdrant-storage
          persistentVolumeClaim:
            claimName: qdrant-pvc
```

!!! note "LLM timeout"
    The default NLWeb timeout for LLM calls is 8 seconds. For Claude Sonnet on complex documents, increase this to at least 30 seconds via an init container or a patched config before deploying.

---

## Multi-view indexing

NLWeb supports multiple *views* of the same content — allowing different audiences to receive answers filtered to their context:

| View name | Audience |
|-----------|----------|
| `indentia-docs-business` | Business stakeholders — high-level answers |
| `indentia-docs-product` | Product managers — feature and capability focus |
| `indentia-docs-technical` | Engineers — full technical depth |
| `indentia-docs-code` | Developers — code examples and API reference |

Pass a `view` parameter in the widget or API call to restrict results to a specific audience.

```bash
curl -X POST https://nlweb.example.com/api/v1/answer \
  -H "Content-Type: application/json" \
  -d '{"query": "How does ACID work?", "view": "indentia-docs-technical"}'
```
