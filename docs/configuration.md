# Configuration Reference

IndentiaDB is configured via a TOML configuration file, environment variables, or a combination of both. Environment variables take precedence over file-based configuration.

By default, IndentiaDB looks for `indentiadb.toml` in the current working directory. Override the path with:

```bash
indentiadb --config /path/to/indentiadb.toml
```

---

## Complete Configuration File

```toml
# =============================================================================
# IndentiaDB Configuration
# =============================================================================

# -----------------------------------------------------------------------------
# Server
# -----------------------------------------------------------------------------
[server]
# Address to bind the main API server (SPARQL, GraphQL, Graph Store, SHACL)
bind_address = "0.0.0.0"

# Main API port
port = 7001

# Allowed CORS origins. Use ["*"] to allow all origins.
cors = ["*"]

# Enable response compression (gzip, deflate)
compression = true

# Maximum time (in seconds) before a client request times out
request_timeout = 30

# Maximum time (in seconds) to keep idle connections open
idle_timeout = 300

# Enable streaming responses for large result sets
streaming = true

# Maximum request body size in bytes (default: 10 MB)
max_body_size = 10485760

# TLS configuration (optional)
# [server.tls]
# cert_file = "/path/to/cert.pem"
# key_file = "/path/to/key.pem"

# Trust X-Forwarded-* headers from reverse proxies
trust_forwarded_headers = false

# -----------------------------------------------------------------------------
# SurrealDB Backend
# -----------------------------------------------------------------------------
[surrealdb]
# SurrealDB endpoint(s). Supports ws://, wss://, http://, https://
# Multiple endpoints enable client-side failover.
endpoints = ["ws://localhost:8000"]

# Default namespace
namespace = "indentiadb"

# Default database
database = "default"

# Authentication credentials for SurrealDB
username = "root"
password = "root"

# Maximum number of concurrent connections to SurrealDB
max_connections = 64

# Connection timeout in seconds
connect_timeout = 10

# Query timeout in seconds (0 = no timeout)
query_timeout = 30

# -----------------------------------------------------------------------------
# Elasticsearch-Compatible API
# -----------------------------------------------------------------------------
[elasticsearch_compat]
# Enable the Elasticsearch-compatible REST API
enabled = true

# Address to bind the ES-compatible API
host = "0.0.0.0"

# Port for the ES-compatible API
port = 9200

# Cluster name reported in API responses
cluster_name = "indentiadb"

# Node name reported in API responses
node_name = "node-1"

# Hybrid search scoring algorithm: "rrf", "bayesian", or "linear"
hybrid_scorer = "rrf"

# Vector search mode: "hnsw" or "brute_force"
vector_search_mode = "hnsw"

# Maximum number of results per search request
max_result_window = 10000

# Enable basic authentication for the ES API
# [elasticsearch_compat.security]
# enabled = false
# username = "elastic"
# password = "changeme"

# -----------------------------------------------------------------------------
# Cluster
# -----------------------------------------------------------------------------
[cluster]
# Enable cluster mode for horizontal scaling and high availability
enabled = false

# Unique node identifier within the cluster
node_id = "node-1"

# List of seed node addresses for cluster discovery
seed_nodes = ["node-1:7100", "node-2:7100", "node-3:7100"]

# Internal cluster communication port
cluster_port = 7100

# Number of data replicas across the cluster
replication_factor = 3

# Raft consensus settings
[cluster.raft]
# Election timeout in milliseconds
election_timeout = 1500

# Heartbeat interval in milliseconds
heartbeat_interval = 300

# Snapshot interval (number of log entries between snapshots)
snapshot_interval = 10000

# Maximum number of in-flight append entries
max_in_flight = 64

# -----------------------------------------------------------------------------
# Query Engine
# -----------------------------------------------------------------------------
[query]
# Enable SPARQL 1.2 features (nested queries, property paths extensions)
sparql_12 = true

# Enable RDF-star support (quoted triples)
rdf_star = true

# Default query timeout in seconds (0 = use server.request_timeout)
timeout = 30

# Enable query result caching
cache_enabled = true

# Maximum number of cached query results
cache_max_entries = 1000

# Cache entry TTL in seconds
cache_ttl = 60

# Enable RDFS/OWL inference during query evaluation
inference = false

# Maximum depth for property path evaluation
max_path_depth = 50

# -----------------------------------------------------------------------------
# Logging
# -----------------------------------------------------------------------------
[logging]
# Log level: "trace", "debug", "info", "warn", "error"
level = "info"

# Log format: "text" (human-readable) or "json" (structured)
format = "text"

# Write logs to file (in addition to stdout)
# file = "/var/log/indentiadb/indentiadb.log"
```

---

## Environment Variables

All configuration values can be set via environment variables. Variable names follow the pattern `INDENTIADB_<SECTION>_<KEY>` in uppercase, or the short forms listed below.

| Variable | Default | Description |
|----------|---------|-------------|
| `INDENTIADB_CONFIG` | `indentiadb.toml` | Path to configuration file |
| `INDENTIADB_BIND_ADDRESS` | `0.0.0.0` | Main server bind address |
| `INDENTIADB_PORT` | `7001` | Main server port |
| `INDENTIADB_CORS` | `*` | Comma-separated allowed CORS origins |
| `INDENTIADB_REQUEST_TIMEOUT` | `30` | Request timeout in seconds |
| `INDENTIADB_TRUST_FORWARDED_HEADERS` | `false` | Trust reverse proxy headers |
| `SURREAL_ENDPOINT` | `ws://localhost:8000` | SurrealDB endpoint |
| `SURREAL_NAMESPACE` | `indentiadb` | SurrealDB namespace |
| `SURREAL_DATABASE` | `default` | SurrealDB database |
| `SURREAL_USERNAME` | `root` | SurrealDB username |
| `SURREAL_PASSWORD` | `root` | SurrealDB password |
| `SURREAL_MAX_CONNECTIONS` | `64` | Max concurrent SurrealDB connections |
| `ES_ENABLED` | `true` | Enable Elasticsearch-compatible API |
| `ES_HOST` | `0.0.0.0` | ES API bind address |
| `ES_PORT` | `9200` | ES API port |
| `ES_CLUSTER_NAME` | `indentiadb` | Cluster name in ES responses |
| `ES_HYBRID_SCORER` | `rrf` | Hybrid scoring: `rrf`, `bayesian`, `linear` |
| `ES_VECTOR_SEARCH_MODE` | `hnsw` | Vector search: `hnsw`, `brute_force` |
| `ES_MAX_RESULT_WINDOW` | `10000` | Max results per search request |
| `CLUSTER_ENABLED` | `false` | Enable cluster mode |
| `CLUSTER_NODE_ID` | `node-1` | Node identifier |
| `CLUSTER_SEED_NODES` | _(none)_ | Comma-separated seed node addresses |
| `CLUSTER_PORT` | `7100` | Internal cluster communication port |
| `CLUSTER_REPLICATION_FACTOR` | `3` | Number of data replicas |
| `RAFT_ELECTION_TIMEOUT` | `1500` | Raft election timeout (ms) |
| `RAFT_HEARTBEAT_INTERVAL` | `300` | Raft heartbeat interval (ms) |
| `QUERY_SPARQL_12` | `true` | Enable SPARQL 1.2 features |
| `QUERY_RDF_STAR` | `true` | Enable RDF-star support |
| `QUERY_TIMEOUT` | `30` | Default query timeout (seconds) |
| `QUERY_CACHE_ENABLED` | `true` | Enable query result caching |
| `QUERY_INFERENCE` | `false` | Enable RDFS/OWL inference |
| `LOG_LEVEL` | `info` | Log level |
| `LOG_FORMAT` | `text` | Log format: `text` or `json` |

---

## Configuration Precedence

Configuration values are resolved in the following order (highest priority first):

1. **Environment variables** -- always take precedence
2. **Configuration file** -- values from the TOML file
3. **Built-in defaults** -- the defaults shown in the table above

---

## Recommended Production Settings

```bash
# Bind to all interfaces
INDENTIADB_BIND_ADDRESS=0.0.0.0
INDENTIADB_PORT=7001

# SurrealDB backend
SURREAL_ENDPOINT=ws://surrealdb:8000
SURREAL_NAMESPACE=production
SURREAL_DATABASE=main
SURREAL_USERNAME=indentiadb
SURREAL_PASSWORD=<strong-password>
SURREAL_MAX_CONNECTIONS=128

# Elasticsearch-compatible API
ES_ENABLED=true
ES_PORT=9200
ES_HYBRID_SCORER=bayesian
ES_VECTOR_SEARCH_MODE=hnsw

# Cluster (3-node minimum)
CLUSTER_ENABLED=true
CLUSTER_NODE_ID=node-1
CLUSTER_SEED_NODES=node-1:7100,node-2:7100,node-3:7100
CLUSTER_REPLICATION_FACTOR=3

# Structured logging for log aggregation
LOG_LEVEL=info
LOG_FORMAT=json
```
