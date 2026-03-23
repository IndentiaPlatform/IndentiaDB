# CLI Reference

The `indentiagraph` command-line interface provides a complete set of tools for running, querying, managing, and administering IndentiaDB instances. Every subcommand supports both human-readable text output and machine-parseable JSON output via the `--format json` global flag, making the CLI equally suited for interactive use and CI/CD pipelines.

---

## Installation

The CLI is included in every IndentiaDB distribution. After installing IndentiaDB, verify the CLI is available:

```bash
indentiagraph --version
```

The binary is statically linked and has no runtime dependencies beyond libc.

---

## Global Flags

Every subcommand inherits these global flags:

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--verbose` | `-v` | `false` | Enable debug-level logging to stderr |
| `--format` | `-f` | `text` | Output format: `text` (human-readable) or `json` (machine-parseable) |

```bash
# JSON output for scripting
indentiagraph --format json query sparql --query "SELECT * WHERE { ?s ?p ?o } LIMIT 5"

# Verbose debug output
indentiagraph -v serve --config config.toml
```

---

## `indentiagraph serve`

Start the IndentiaDB server. This launches the main HTTP server (SPARQL, REST, GraphQL, WebSocket), the Elasticsearch-compatible API on port 9200, and optionally joins a Raft cluster.

### Usage

```bash
indentiagraph serve [OPTIONS]
```

### Options

| Option | Short | Default | Description |
|--------|-------|---------|-------------|
| `--config` | `-c` | Auto-detected | Path to TOML configuration file |
| `--port` | `-p` | `7001` | HTTP server port (overrides config) |
| `--bind-address` | `-b` | `0.0.0.0` | HTTP server bind address (overrides config) |
| `--es-port` | | `9200` | Elasticsearch-compatible API port (overrides config) |
| `--es-bind-address` | | `0.0.0.0` | Elasticsearch API bind address (overrides config) |
| `--index` | `-i` | | Path to index files (overrides config) |
| `--node-id` | | | Node ID for Raft cluster mode (overrides config) |
| `--seed-nodes` | | | Comma-separated seed node addresses for cluster discovery |

### Examples

Start a development server with default settings:

```bash
indentiagraph serve
```

Start with a specific configuration file and port override:

```bash
indentiagraph serve --config /etc/indentiadb/config.toml --port 8080
```

Start a cluster node with seed discovery:

```bash
indentiagraph serve \
  --config config.toml \
  --node-id 2 \
  --seed-nodes "node-1.internal:7002,node-3.internal:7002"
```

!!! tip "Configuration File Auto-Detection"
    When `--config` is not specified, IndentiaDB searches for `config.toml` or `indentiagraph.toml` in the current working directory. Use the `INDENTIADB_CONFIG` environment variable to set a default path without passing `--config` on every invocation.

---

## `indentiagraph query`

Execute queries against a running IndentiaDB instance. The `query` command has subcommands for each query protocol: SPARQL, SPARQL UPDATE, Graph Store Protocol, GraphQL, SHACL validation, and GeoSPARQL evaluation.

### `query sparql` -- Execute SPARQL SELECT/CONSTRUCT/ASK/DESCRIBE

```bash
indentiagraph query sparql [OPTIONS]
```

| Option | Default | Description |
|--------|---------|-------------|
| `--query` | | SPARQL query text (inline) |
| `--file` | | Read query from file (use `-` for stdin) |
| `--method` | `post` | HTTP method: `get` or `post` |
| `--format` | | Request specific result format (e.g. `json`, `xml`, `csv`) |
| `--consistency` | | Request consistency level (e.g. `strong`) |
| `--no-streaming` | `false` | Disable server-side streaming |
| `--accept` | | Override the HTTP Accept header |
| `--ndjson` | `false` | Request NDJSON streaming response |
| `--show-status` | `false` | Print HTTP status line |
| `--include-headers` | `false` | Print HTTP response headers |
| `--allow-http-error` | `false` | Do not exit with error on non-2xx status |

#### Examples

Inline query:

```bash
indentiagraph query sparql \
  --endpoint http://localhost:7001 \
  --query "SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 10"
```

Query from file:

```bash
indentiagraph query sparql \
  --profile prod \
  --file queries/find-employees.rq
```

Query from stdin (pipe from another program):

```bash
cat query.rq | indentiagraph query sparql --profile prod --file -
```

Request CSV output:

```bash
indentiagraph query sparql \
  --endpoint http://localhost:7001 \
  --query "SELECT ?name ?age WHERE { ?p foaf:name ?name ; foaf:age ?age }" \
  --accept "text/csv"
```

NDJSON streaming for large result sets:

```bash
indentiagraph query sparql \
  --profile prod \
  --query "SELECT * WHERE { ?s ?p ?o }" \
  --ndjson
```

### `query update` -- Execute SPARQL UPDATE

```bash
indentiagraph query update [OPTIONS]
```

| Option | Default | Description |
|--------|---------|-------------|
| `--update` | | SPARQL UPDATE text (inline) |
| `--file` | | Read update from file (use `-` for stdin) |

#### Examples

Insert triples:

```bash
indentiagraph query update \
  --profile prod \
  --update "INSERT DATA { <http://example.org/alice> <http://xmlns.com/foaf/0.1/name> 'Alice' . }"
```

Load from file:

```bash
indentiagraph query update --profile prod --file migrations/add-schema.ru
```

### `query graph` -- Graph Store Protocol

```bash
indentiagraph query graph [OPTIONS]
```

| Option | Default | Description |
|--------|---------|-------------|
| `--endpoint-path` | `data` | Graph Store endpoint: `data` or `graph-store` |
| `--method` | | HTTP method: `get`, `head`, `put`, `post`, `patch`, `delete` |
| `--graph` | | Named graph IRI |
| `--default-graph` | `false` | Target the default graph |
| `--data` | | RDF payload text |
| `--file` | | Read RDF payload from file |
| `--content-type` | `text/turtle` | RDF serialization format |

#### Examples

Retrieve a named graph as Turtle:

```bash
indentiagraph query graph \
  --profile prod \
  --method get \
  --graph "http://example.org/employees"
```

Upload Turtle data to a named graph:

```bash
indentiagraph query graph \
  --profile prod \
  --method put \
  --graph "http://example.org/employees" \
  --file data/employees.ttl \
  --content-type "text/turtle"
```

Delete a named graph:

```bash
indentiagraph query graph \
  --profile prod \
  --method delete \
  --graph "http://example.org/old-data"
```

### `query graphql` -- Execute GraphQL Queries

```bash
indentiagraph query graphql [OPTIONS]
```

| Option | Default | Description |
|--------|---------|-------------|
| `--query` | | GraphQL query text |
| `--file` | | Read query from file |
| `--variables` | | Variables as inline JSON string |
| `--variables-file` | | Read variables from JSON file |
| `--operation-name` | | GraphQL operation name |

#### Example

```bash
indentiagraph query graphql \
  --profile prod \
  --query '{ persons(limit: 5) { name email } }' \
  --variables '{"limit": 5}'
```

### `query shacl` -- SHACL Validation

```bash
indentiagraph query shacl [OPTIONS]
```

| Option | Default | Description |
|--------|---------|-------------|
| `--shapes` | | SHACL shapes text |
| `--file` | | Read shapes from file |
| `--format` | | Shapes format: `turtle`, `jsonld`, `ntriples`, `rdfxml` |
| `--graph-iri` | | Specific graph IRI to validate |
| `--timeout-ms` | | Validation timeout in milliseconds |
| `--include-warnings` | | Include warning-level violations |
| `--include-infos` | | Include info-level violations |
| `--enable-sparql-constraints` | | Enable SHACL-SPARQL constraints |
| `--enable-rules` | | Enable SHACL rules inference |

#### Example

```bash
indentiagraph query shacl \
  --profile prod \
  --file shapes/person-shape.ttl \
  --graph-iri "http://example.org/employees" \
  --include-warnings true
```

### `query geo` -- GeoSPARQL Function Evaluation

```bash
indentiagraph query geo [OPTIONS]
```

| Option | Default | Description |
|--------|---------|-------------|
| `--function` | | GeoSPARQL function IRI or short name |
| `--arg` | | Argument as JSON term object (repeatable) |
| `--args-file` | | Read arguments from JSON array file |

#### Example

```bash
indentiagraph query geo \
  --profile prod \
  --function "geof:distance" \
  --arg '{"type": "literal", "value": "POINT(4.9 52.3)", "datatype": "geo:wktLiteral"}' \
  --arg '{"type": "literal", "value": "POINT(5.1 52.1)", "datatype": "geo:wktLiteral"}'
```

---

## `indentiagraph validate`

Validate the integrity of IndentiaDB index files. This checks permutation index files (SPO, SOP, PSO, POS, OSP, OPS), vocabulary files, block metadata structure, and performs sample decompression tests to detect corruption.

### Usage

```bash
indentiagraph validate --index <PATH> [OPTIONS]
```

### Options

| Option | Short | Default | Description |
|--------|-------|---------|-------------|
| `--index` | `-i` | (required) | Path to index files (base path without extension) |
| `--sample-size` | `-s` | `5` | Number of blocks to sample per permutation for decompression testing |

### Examples

Validate with default sampling:

```bash
indentiagraph validate --index /var/lib/indentiadb/data/index
```

Deep validation with more samples:

```bash
indentiagraph validate --index /var/lib/indentiadb/data/index --sample-size 50
```

JSON output for CI pipelines:

```bash
indentiagraph --format json validate --index /var/lib/indentiadb/data/index
```

!!! warning "Validation Does Not Require a Running Server"
    The `validate` command reads index files directly from disk. It can be run while the server is stopped, making it suitable for pre-start health checks and post-backup verification.

---

## `indentiagraph backup`

Create, list, verify, restore, and prune backups. Backups can cover the full database or specific components (indices, tables, graphs, or arbitrary paths). Each backup produces a `manifest.json` with SHA-256 checksums for every file.

### `backup create`

```bash
indentiagraph backup create --source <DIR> [OPTIONS]
```

| Option | Default | Description |
|--------|---------|-------------|
| `--source` | (required) | Source root directory |
| `--repository` | `./backups` | Backup repository directory |
| `--id` | Timestamp-based | Backup identifier |
| `--index` | | Add index component as `NAME=PATH` (repeatable) |
| `--table` | | Add table component as `NAME=PATH` (repeatable) |
| `--graph` | | Add graph component as `NAME=PATH` (repeatable) |
| `--path` | | Add custom path component (repeatable) |
| `--dry-run` | `false` | Only print what would be backed up |

#### Examples

Full database backup:

```bash
indentiagraph backup create \
  --source /var/lib/indentiadb/data \
  --repository /mnt/backups/indentiadb
```

Selective backup of specific components:

```bash
indentiagraph backup create \
  --source /var/lib/indentiadb/data \
  --repository /mnt/backups/indentiadb \
  --id "pre-migration-2026-03" \
  --index "spo=permutations/spo" \
  --index "pos=permutations/pos" \
  --graph "employees=graphs/employees"
```

Dry run to preview what will be backed up:

```bash
indentiagraph backup create \
  --source /var/lib/indentiadb/data \
  --dry-run
```

### `backup list`

```bash
indentiagraph backup list --repository /mnt/backups/indentiadb
```

### `backup show`

```bash
indentiagraph backup show \
  --repository /mnt/backups/indentiadb \
  --id "bk-1711929600"
```

### `backup verify`

Verify SHA-256 checksums and file sizes for all files in a backup:

```bash
indentiagraph backup verify \
  --repository /mnt/backups/indentiadb \
  --id "bk-1711929600"
```

!!! tip "Verify After Every Backup"
    Run `backup verify` immediately after `backup create` and periodically thereafter to detect bit rot on the backup storage medium. Exit code 0 means all checksums match.

### `backup restore`

```bash
indentiagraph backup restore \
  --repository /mnt/backups/indentiadb \
  --id "bk-1711929600" \
  --destination /var/lib/indentiadb/data \
  --overwrite
```

Selective restore (only specific components):

```bash
indentiagraph backup restore \
  --repository /mnt/backups/indentiadb \
  --id "bk-1711929600" \
  --destination /var/lib/indentiadb/data \
  --index spo \
  --index pos \
  --overwrite
```

Dry-run restore:

```bash
indentiagraph backup restore \
  --repository /mnt/backups/indentiadb \
  --id "bk-1711929600" \
  --destination /tmp/restore-test \
  --dry-run
```

### `backup prune`

Remove old backups, keeping only the newest N:

```bash
indentiagraph backup prune \
  --repository /mnt/backups/indentiadb \
  --keep 5
```

Preview what would be removed:

```bash
indentiagraph backup prune \
  --repository /mnt/backups/indentiadb \
  --keep 5 \
  --dry-run
```

---

## `indentiagraph auth`

Manage authentication profiles and OIDC tokens. The CLI stores connection profiles in `~/.config/indentiagraph/profiles.toml` and cached tokens in `~/.config/indentiagraph/tokens.json` (file permissions `0600`).

### `auth login` -- OIDC Device Flow Login

Authenticate using the OIDC device authorization flow. The CLI displays a URL and code; open the URL in a browser to complete authentication.

```bash
indentiagraph auth login \
  --profile prod \
  --endpoint https://indentiadb.example.com:7001 \
  --issuer https://auth.example.com/realms/indentiadb \
  --client-id indentiadb-cli \
  --scope "openid profile" \
  --default
```

| Option | Default | Description |
|--------|---------|-------------|
| `--profile` | (required) | Profile name to create or update |
| `--endpoint` | (required) | IndentiaDB server endpoint |
| `--issuer` | (required) | OIDC issuer URL |
| `--client-id` | (required) | OIDC client ID |
| `--scope` | | OAuth scopes |
| `--default` | `false` | Set as default profile |
| `--insecure` | `false` | Skip TLS certificate verification |
| `--timeout-secs` | `30` | HTTP request timeout |

### `auth token` -- Inspect or Refresh Tokens

```bash
# Show token info (masked by default)
indentiagraph auth token --profile prod

# Show full token values (use with caution)
indentiagraph auth token --profile prod --show-full

# Force a token refresh
indentiagraph auth token --profile prod --refresh
```

### `auth logout` -- Remove Cached Tokens

```bash
indentiagraph auth logout --profile prod
```

### `auth profiles list`

```bash
indentiagraph auth profiles list
```

Output:

```
* prod -> https://indentiadb.example.com:7001
  dev  -> http://localhost:7001
```

The `*` marker indicates the default profile.

### `auth profiles show`

```bash
indentiagraph auth profiles show --profile prod
```

### `auth profiles set-default`

```bash
indentiagraph auth profiles set-default --profile dev
```

---

## Connection Profiles

Connection profiles store endpoint URLs and authentication settings so you do not have to pass `--endpoint`, `--bearer-token`, or credentials on every command invocation.

### Profile Configuration File

Profiles are stored in `~/.config/indentiagraph/profiles.toml`:

```toml
default_profile = "prod"

[profiles.prod]
endpoint = "https://indentiadb.example.com:7001"
auth_mode = "oidc"

[profiles.prod.oidc]
issuer = "https://auth.example.com/realms/indentiadb"
client_id = "indentiadb-cli"
scope = "openid profile"
token_endpoint = "https://auth.example.com/realms/indentiadb/protocol/openid-connect/token"

[profiles.dev]
endpoint = "http://localhost:7001"
auth_mode = "basic"
username = "root"
password = "root"

[profiles.staging]
endpoint = "https://staging.indentiadb.internal:7001"
auth_mode = "bearer"
bearer_token = "eyJhbGciOi..."
```

### Authentication Modes

| Mode | Description | When to Use |
|------|-------------|-------------|
| `oidc` | OIDC device flow with automatic token refresh | Production environments with an identity provider |
| `bearer` | Static bearer token | Service accounts, short-lived scripts |
| `basic` | HTTP Basic Auth (username + password) | Development, local testing |

### Connection Flags

Any query or auth command accepts these connection flags, which override profile settings:

| Flag | Description |
|------|-------------|
| `--profile` | Select a named profile |
| `--endpoint` | Override the server endpoint URL |
| `--bearer-token` | Override with a specific bearer token |
| `--username` | Override Basic Auth username |
| `--password` | Override Basic Auth password |
| `--insecure` | Skip TLS certificate verification |
| `--timeout-secs` | HTTP request timeout in seconds (default: 30) |
| `--no-refresh` | Disable automatic OIDC token refresh |

!!! note "Token Auto-Refresh"
    When using an OIDC profile, the CLI automatically refreshes expired access tokens using the stored refresh token before sending a request. If the refresh fails, the CLI returns a `401` error and you must re-authenticate with `auth login`. Use `--no-refresh` to disable this behavior.

---

## `indentiagraph generate-config`

Generate a sample TOML configuration file with sensible defaults and inline comments:

```bash
# Print to stdout
indentiagraph generate-config

# Write to file
indentiagraph generate-config --output /etc/indentiadb/config.toml

# Without comments (minimal)
indentiagraph generate-config --output config.toml --comments false
```

---

## Environment Variables

The CLI respects the same environment variables as the server. The most relevant for CLI usage:

| Variable | Description |
|----------|-------------|
| `INDENTIADB_CONFIG` | Default path to configuration file |
| `INDENTIADB_PORT` | Default server port |
| `INDENTIADB_BIND_ADDRESS` | Default bind address |
| `SURREAL_ENDPOINT` | SurrealDB WebSocket endpoint |
| `SURREAL_USERNAME` | SurrealDB username |
| `SURREAL_PASSWORD` | SurrealDB password |
| `LOG_LEVEL` | Log level: `trace`, `debug`, `info`, `warn`, `error` |
| `LOG_FORMAT` | Log format: `json` or `text` |

See [Configuration Reference](configuration.md) for the complete list.

---

## Scripting and Automation

### JSON Output for Pipelines

Use `--format json` to get structured output suitable for parsing with `jq`:

```bash
# Get backup list as JSON and extract IDs
indentiagraph --format json backup list \
  --repository /mnt/backups | jq '.[].id'

# Check backup verification result
RESULT=$(indentiagraph --format json backup verify \
  --repository /mnt/backups --id "bk-latest")
echo "$RESULT" | jq '.ok'
```

### Cron Job: Nightly Backup with Pruning

```bash
#!/bin/bash
set -euo pipefail

REPO="/mnt/backups/indentiadb"
SOURCE="/var/lib/indentiadb/data"

# Create backup
indentiagraph backup create \
  --source "$SOURCE" \
  --repository "$REPO"

# Verify the latest backup
LATEST=$(indentiagraph --format json backup list --repository "$REPO" \
  | jq -r '.[0].id')
indentiagraph backup verify --repository "$REPO" --id "$LATEST"

# Keep only the 7 most recent backups
indentiagraph backup prune --repository "$REPO" --keep 7
```

### Health Check Script

```bash
#!/bin/bash
# Quick health check: run a trivial SPARQL query
indentiagraph query sparql \
  --profile prod \
  --query "ASK { ?s ?p ?o }" \
  --allow-http-error \
  --show-status
```

---

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | General error (invalid arguments, missing files, network failure) |
| `1` | HTTP error response (non-2xx) unless `--allow-http-error` is set |
| `1` | Backup verification failed (missing or corrupt files) |

!!! warning "Non-2xx HTTP Responses"
    By default, the CLI exits with code 1 when the server returns a non-2xx HTTP status. Use `--allow-http-error` to suppress this behavior when you want to inspect the error response body in scripts.
