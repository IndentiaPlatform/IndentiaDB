# Configuration Reference

IndentiaDB is configured via a TOML file and/or environment variables. Environment variables take precedence over the configuration file.

!!! info "Configuration file location"
    By default, IndentiaDB looks for `config.toml` in the current working directory.
    Override with `INDENTIADB_CONFIG=/path/to/config.toml` or `--config /path/to/config.toml`.

---

## Complete Configuration Reference

```toml
# ─────────────────────────────────────────────────────────────
# [server] — HTTP server settings
# ─────────────────────────────────────────────────────────────
[server]

# Address to bind the main HTTP server (SPARQL, REST, GraphQL, WebSocket)
bind_address = "0.0.0.0"

# Port for the main server
port = 7001

# CORS allowed origins. Use "*" to allow all origins (not recommended for production).
cors = ["*"]

# Enable response compression (gzip/brotli)
compression = true

# Maximum time (seconds) to wait for a request to complete before returning a timeout error
request_timeout = 60

# Keep-alive timeout for idle connections (seconds)
idle_timeout = 120

# Enable HTTP/2 server-sent events and streaming responses
streaming = true

# Maximum request body size in bytes (default 100 MB)
max_body_size = 104857600

# Trust X-Forwarded-For and X-Real-IP headers from reverse proxies
# Set to true only when running behind a trusted reverse proxy
trust_forwarded_headers = false


# ─────────────────────────────────────────────────────────────
# [surrealdb] — SurrealDB backend connection
# ─────────────────────────────────────────────────────────────
[surrealdb]

# WebSocket endpoints for SurrealDB. Multiple endpoints for load balancing.
endpoints = ["ws://localhost:8000"]

# SurrealDB namespace
namespace = "indentia"

# SurrealDB database name
database = "main"

# SurrealDB root username
username = "root"

# SurrealDB root password
password = "root"

# Connection pool maximum size
max_connections = 16

# Timeout for establishing a new connection (seconds)
connect_timeout = 10

# Timeout for individual queries (seconds). Overrides [query].timeout for SurrealQL queries.
query_timeout = 30


# ─────────────────────────────────────────────────────────────
# [elasticsearch_compat] — Elasticsearch-compatible API
# ─────────────────────────────────────────────────────────────
[elasticsearch_compat]

# Enable the Elasticsearch-compatible REST API
enabled = true

# Address to bind the ES-compatible server
host = "0.0.0.0"

# Port for the ES-compatible API (standard ES port)
port = 9200

# Cluster name returned in ES API responses
cluster_name = "indentiadb"

# Node name returned in ES API responses
node_name = "node-1"

# Hybrid search score fusion algorithm
# Options:
#   rrf      — Reciprocal Rank Fusion (NDCG@10: 0.8874)
#   bayesian — Bayesian probability calibration (NDCG@10: 0.9149, recommended)
#   linear   — Weighted linear combination (requires manual alpha tuning)
hybrid_scorer = "bayesian"

# Vector index type for dense vector fields
# Options:
#   hnsw        — Hierarchical Navigable Small World (fast approximate NN, recommended)
#   brute_force — Exact nearest neighbor (use only for small datasets < 10k vectors)
vector_search_mode = "hnsw"

# Maximum number of results that can be returned by a single search
max_result_window = 10000


# ─────────────────────────────────────────────────────────────
# [cluster] — Raft high-availability clustering
# ─────────────────────────────────────────────────────────────
[cluster]

# Enable Raft cluster mode. Requires at least 3 nodes for fault tolerance.
enabled = false

# Unique identifier for this node within the cluster
node_id = "node-1"

# Addresses of other cluster nodes (host:port)
seed_nodes = []
# seed_nodes = ["node-2:7002", "node-3:7002"]

# Port for inter-node Raft communication
cluster_port = 7002

# Number of replicas for each data partition (must be <= number of nodes)
replication_factor = 3

# Raft consensus algorithm parameters
[cluster.raft]

# Election timeout range in milliseconds [min, max]
election_timeout = [150, 300]

# Heartbeat interval in milliseconds (must be < election_timeout min)
heartbeat_interval = 50

# Snapshot interval: trigger a Raft log snapshot every N applied entries
snapshot_interval = 10000

# Maximum number of in-flight Raft append entries requests
max_in_flight = 256


# ─────────────────────────────────────────────────────────────
# [query] — Query engine settings
# ─────────────────────────────────────────────────────────────
[query]

# Enable SPARQL 1.2 features (RDF-star, Triple Terms, SEMIJOIN, ANTIJOIN, quoted triples)
sparql_12 = true

# Enable RDF-star native support (required for triple-level ACL)
rdf_star = true

# Global query timeout in seconds. Applied to SPARQL and SurrealQL queries.
timeout = 30

# Enable query result caching
cache_enabled = true

# Maximum number of cached query results
cache_max_entries = 1024

# Cache entry time-to-live in seconds
cache_ttl = 300

# Enable RDFS/OWL forward-chaining inference
# Entailed triples are materialized at write time and stored in the inference graph.
inference = false

# Maximum graph traversal depth for LPG path queries and SPARQL property paths
max_path_depth = 10


# ─────────────────────────────────────────────────────────────
# [logging] — Logging configuration
# ─────────────────────────────────────────────────────────────
[logging]

# Log level: trace | debug | info | warn | error
level = "info"

# Log output format: json | text
format = "json"
```

---

## Environment Variables

All configuration options can be set via environment variables. Environment variables take precedence over the TOML file.

### Server

| Variable | Default | Description |
|----------|---------|-------------|
| `INDENTIADB_CONFIG` | `config.toml` | Path to the TOML configuration file |
| `INDENTIADB_BIND_ADDRESS` | `0.0.0.0` | HTTP server bind address |
| `INDENTIADB_PORT` | `7001` | Main HTTP server port |
| `INDENTIADB_CORS` | `*` | Comma-separated allowed CORS origins |
| `INDENTIADB_REQUEST_TIMEOUT` | `60` | Request timeout in seconds |
| `INDENTIADB_TRUST_FORWARDED_HEADERS` | `false` | Trust X-Forwarded-For headers |

### SurrealDB Backend

| Variable | Default | Description |
|----------|---------|-------------|
| `SURREAL_ENDPOINT` | — | SurrealDB WebSocket endpoint (`ws://host:port`) |
| `SURREAL_NAMESPACE` | `indentia` | SurrealDB namespace |
| `SURREAL_DATABASE` | `main` | SurrealDB database name |
| `SURREAL_USERNAME` | `root` | SurrealDB username |
| `SURREAL_PASSWORD` | `root` | SurrealDB password |
| `SURREAL_MAX_CONNECTIONS` | `16` | Connection pool size |

### Elasticsearch-Compatible API

| Variable | Default | Description |
|----------|---------|-------------|
| `ES_ENABLED` | `true` | Enable the Elasticsearch-compatible API |
| `ES_HOST` | `0.0.0.0` | ES API bind address |
| `ES_PORT` | `9200` | ES API port |
| `ES_CLUSTER_NAME` | `indentiadb` | Cluster name in ES responses |
| `ES_HYBRID_SCORER` | `rrf` | Hybrid search scorer (`rrf`, `bayesian`, `linear`) |
| `ES_VECTOR_SEARCH_MODE` | `hnsw` | Vector index type (`hnsw`, `brute_force`) |
| `ES_MAX_RESULT_WINDOW` | `10000` | Maximum search result window |

### Cluster (Raft)

| Variable | Default | Description |
|----------|---------|-------------|
| `CLUSTER_ENABLED` | `false` | Enable Raft cluster mode |
| `CLUSTER_NODE_ID` | — | Unique node identifier |
| `CLUSTER_SEED_NODES` | — | Comma-separated seed node addresses (`host:port`) |
| `CLUSTER_PORT` | `7002` | Inter-node Raft communication port |
| `CLUSTER_REPLICATION_FACTOR` | `3` | Data replication factor |

### Raft Consensus

| Variable | Default | Description |
|----------|---------|-------------|
| `RAFT_ELECTION_TIMEOUT` | `150-300` | Election timeout range in milliseconds |
| `RAFT_HEARTBEAT_INTERVAL` | `50` | Heartbeat interval in milliseconds |

### Query Engine

| Variable | Default | Description |
|----------|---------|-------------|
| `QUERY_SPARQL_12` | `true` | Enable SPARQL 1.2 features |
| `QUERY_RDF_STAR` | `true` | Enable RDF-star support |
| `QUERY_TIMEOUT` | `30` | Query timeout in seconds |
| `QUERY_CACHE_ENABLED` | `true` | Enable query result caching |
| `QUERY_INFERENCE` | `false` | Enable RDFS/OWL inference |

### Logging

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `info` | Log level (`trace`, `debug`, `info`, `warn`, `error`) |
| `LOG_FORMAT` | `json` | Log format (`json`, `text`) |

---

## Production Configuration Example

!!! warning "Change all default passwords"
    The default `username = "root"` and `password = "root"` are suitable for development only. Always set strong credentials in production.

```toml
[server]
bind_address = "0.0.0.0"
port = 7001
cors = ["https://your-app.example.com"]
compression = true
request_timeout = 30
idle_timeout = 90
max_body_size = 52428800          # 50 MB
trust_forwarded_headers = true    # Behind a reverse proxy

[surrealdb]
endpoints = [
  "ws://surrealdb-0.surrealdb.svc:8000",
  "ws://surrealdb-1.surrealdb.svc:8000",
  "ws://surrealdb-2.surrealdb.svc:8000",
]
namespace = "prod"
database = "main"
username = "indentiadb"
password = "CHANGE_ME"            # Use a secret manager in production
max_connections = 32
connect_timeout = 5
query_timeout = 20

[elasticsearch_compat]
enabled = true
host = "0.0.0.0"
port = 9200
cluster_name = "prod-cluster"
node_name = "indentiadb-0"
hybrid_scorer = "bayesian"
vector_search_mode = "hnsw"
max_result_window = 10000

[cluster]
enabled = true
node_id = "node-0"
seed_nodes = [
  "indentiadb-1.indentiadb.svc:7002",
  "indentiadb-2.indentiadb.svc:7002",
]
cluster_port = 7002
replication_factor = 3

[cluster.raft]
election_timeout = [150, 300]
heartbeat_interval = 50
snapshot_interval = 50000
max_in_flight = 256

[query]
sparql_12 = true
rdf_star = true
timeout = 20
cache_enabled = true
cache_max_entries = 4096
cache_ttl = 600
inference = true
max_path_depth = 15

[logging]
level = "warn"
format = "json"
```

!!! tip "Kubernetes secrets for passwords"
    In Kubernetes, mount secrets as environment variables rather than embedding passwords in the config file:

    ```yaml
    env:
      - name: SURREAL_PASSWORD
        valueFrom:
          secretKeyRef:
            name: indentiadb-secrets
            key: surreal-password
    ```

---

## Minimal Development Configuration

```toml
[server]
bind_address = "127.0.0.1"
port = 7001

[surrealdb]
endpoints = ["ws://localhost:8000"]
namespace = "dev"
database = "main"
username = "root"
password = "root"

[elasticsearch_compat]
enabled = true
port = 9200
hybrid_scorer = "bayesian"

[logging]
level = "debug"
format = "text"
```

---

## Configuration Precedence

Settings are resolved in this order (highest precedence first):

1. **CLI flags** (`--port 7001`)
2. **Environment variables** (`INDENTIADB_PORT=7001`)
3. **TOML configuration file** (`config.toml`)
4. **Built-in defaults**
