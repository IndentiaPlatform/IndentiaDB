# Getting Started

Welcome to IndentiaDB. This section takes you from zero to a running instance with your first queries executing in under five minutes.

---

## What You Will Learn

By the end of this section you will be able to:

- Install and run IndentiaDB locally using Docker or a pre-built binary
- Execute SPARQL 1.2 queries against RDF data
- Store and query JSON documents using SurrealQL
- Index and search documents using the Elasticsearch-compatible API
- Run a hybrid BM25 + vector search query
- Understand the key configuration options

---

## Prerequisites

=== "Docker (recommended)"

    - Docker 24.0+ or Docker Desktop
    - Docker Compose v2.20+ (for multi-container setups)
    - No other dependencies required

    !!! tip "Fastest path"
        Docker is the recommended installation method. You get a fully working instance in a single command with no build toolchain required.

=== "Pre-built binary"

    - Linux (x86_64 or aarch64) or macOS (x86_64 or Apple Silicon)
    - A running SurrealDB instance (embedded mode available)
    - `curl` for the download

---

## Installation Options

| Method | Time | Requires | Best For |
|--------|------|----------|----------|
| **Docker one-liner** | ~30 seconds | Docker | Evaluation, development, CI |
| **Docker Compose** | ~1 minute | Docker Compose | Local dev with persistent data |
| **Pre-built binary** | ~1 minute | Linux/macOS | Production on bare metal or VMs |
| **Kubernetes operator** | ~5 minutes | kubectl, Helm | Production cluster deployments |

!!! warning "SurrealDB backend required for binary installs"
    The pre-built binary requires a SurrealDB instance. The Docker image bundles everything. If you are evaluating IndentiaDB, use Docker.

---

## Next Steps

1. **[Quick Start](quickstart.md)** — Run your first queries in minutes
2. **[Configuration](configuration.md)** — Full TOML config and environment variable reference
3. **[Concepts: Architecture](../concepts/architecture.md)** — Understand the internal design
4. **[Query Languages](../query-languages/index.md)** — SPARQL 1.2, SurrealQL, LPG, hybrid queries
