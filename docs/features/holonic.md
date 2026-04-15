# Holonic Four-Graph Layer

Native implementation of Kurt Cagle's holonic knowledge-graph
model (after Koestler's *holon* concept) on top of named graphs.
Each entity is a single IRI that binds four graphs — Interior /
Boundary / Context / Meta — and SHACL shapes in the boundary graph
act as a formal membrane: a violation is not "bad data" to be
cleaned up but a circuit-breaker signal that downstream RAG paths
consult to demote or block the holon.

The implementation lives in the `indentiagraph-holonic` crate and
is mounted by the server under `/holonic/*` when explicitly
enabled. It ships with its own Axum router, its own SHACL
validation entry point, and a backing store that proxies SPARQL
to the live dataset.

## Opt-in configuration

Holonic is **not on by default**. Two equivalent activation paths:

=== "TOML"

    ```toml
    [holonic]
    enabled = true
    default_tenant = "acme"   # fallback when ?tenant= is omitted
    ```

=== "Environment"

    ```bash
    HOLONIC_ENABLED=true
    HOLONIC_DEFAULT_TENANT=acme
    ```

The server calls `AppState::enable_holonic(default_tenant)` at
start-up. This:

1. Builds a `SwarmHolonicStore` bound to the same `SwarmDataset`
   as the rest of the server.
2. Bootstraps the CGA T-Box (`cga.ttl`) into the shared ontology
   named graph idempotently.
3. Mounts the `/holonic/*` router under the main Axum app.
4. Adds `/holonic/health` to the authentication bypass list so
   orchestrators can probe readiness without credentials.

## Startup guards

Both guards fail **at startup**, not on first request, so a
misconfiguration surfaces before any traffic arrives.

### Cluster-mode refused

`enable_holonic` errors out immediately when a `ClusterManager`
is attached to the state:

```
holonic service cannot run under the Raft cluster manager yet;
writes would diverge from followers. Disable holonic or run
standalone (see SwarmHolonicStore cluster-mode TODO).
```

Holonic writes intentionally bypass the `UpdateExecutor` path
used by `/update`; in cluster mode this would diverge from
followers. Run the node standalone for holonic ingest, or extend
`SwarmHolonicStore::update` with a Raft proposal path before
enabling both.

### Empty tenant refused

```
enable_holonic: default_tenant must not be empty
```

An empty default tenant would collapse every `?tenant=`-less
request into a single registry graph shared across deployments.
Provide a concrete slug (typically `_` for a shared reference
tenant, or a per-deployment tenant ID).

## Readiness contract

`GET /holonic/health` is **always mounted** — regardless of
whether `enable_holonic` succeeded. Clients get a stable contract:

| Status | Meaning |
|--------|---------|
| `200` + JSON | Holonic service attached; body is `{"available": true, "default_tenant": "..."}` |
| `503` | Holonic is not configured on this server |

The endpoint is in the server's `AUTH_BYPASS_PATHS`, so
Kubernetes probes, ArgoCD health checks, and external monitoring
can poll it without credentials.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/holonic/health` | Readiness probe (200/503) |
| `POST` | `/holonic/holons?tenant=…` | Declare a holon in the tenant registry graph |
| `GET` | `/holonic/holons?tenant=…` | List holons with interior/boundary counts |
| `GET` | `/holonic/holons/{iri}?tenant=…` | Detail for one holon, including every layer |
| `POST` | `/holonic/holons/{iri}/interior` | Add interior A-Box triples (per source) |
| `POST` | `/holonic/holons/{iri}/boundary` | Inject SHACL shapes as the holon's membrane |
| `POST` | `/holonic/holons/{iri}/context` | Add context / PROV-O events |
| `POST` | `/holonic/holons/{iri}/projection` | Add a projection layer |
| `POST` | `/holonic/portals` | Register a `cga:TransformPortal` |
| `GET` | `/holonic/portals?source=…` | List outbound portals from a holon |
| `GET` | `/holonic/depth?holon=…` | Compute holarchy depth |

All POST bodies use JSON with a `turtle:` string field for
RDF payloads (except `add_holon` / `add_portal`, which take
structured fields directly). The `tenant=` query parameter
defaults to `HOLONIC_DEFAULT_TENANT` when omitted.

## Authorization

When an `AuthenticationService` is configured, the `/holonic/*`
router sits behind a dedicated middleware that enforces:

1. **Anonymous callers are rejected with 401** on every endpoint
   (except `/holonic/health`, which is in the auth-bypass list).
   This holds even in deployments where the base authn layer
   accepts anonymous actors for other routes.
2. **`GET` / `HEAD` require `Permission::Read`**; a caller with
   `Permission::None` gets 403.
3. **`POST` / `PUT` / `PATCH` / `DELETE` require
   `Permission::Write`**. Writes with authn configured but no
   authz service also return 403 — the operator clearly wanted
   credentials enforced but has not yet attached the permission
   layer.
4. **Cross-tenant `?tenant=` mismatches are audit-logged** under
   the `holonic.authz` tracing target with the actor's org-scope
   slug and the requested tenant. Blocking (rather than logging)
   requires a canonical tenant claim on `Actor`, which is
   tracked in a follow-up ADR.

In dev / standalone deployments without any authentication
service the middleware falls through — the orchestration can use
`/holonic/*` for local experimentation without setting up OIDC.

## Backing store

`SwarmHolonicStore` (`indentiagraph-server/src/holonic_store.rs`)
proxies the `HolonicStore` trait to the live `SwarmDataset`:

- **Reads** run through `QueryExecutor::execute` inside
  `tokio::task::spawn_blocking` so the `spareval` path does not
  starve the async runtime.
- **Writes** use the standalone `DeltaTriples::apply` commit path
  with `StagingVocabulary` + `StagedBlankNodeAllocator` so
  concurrent updates cannot allocate overlapping LocalVocab IDs.
- **Turtle with `@prefix`** is parsed by `oxttl::TurtleParser`
  first and emitted as N-Triples inside `INSERT DATA { GRAPH … }`
  — SPARQL UPDATE rejects `@prefix` inside DATA blocks, so the
  default `HolonicStore::parse_into` cannot be reused.
- **An `update_mutex`** serialises writes; holding the mutex
  across the `spawn_blocking` boundary is required because the
  blocking task may start before the async lock is dropped.

## Example — declare a holon and inject a membrane

```bash
# 1. Declare
curl -X POST "http://localhost:7001/holonic/holons?tenant=acme" \
  -H 'Content-Type: application/json' \
  -d '{"iri":"https://id.indentia.ai/identity/person/acme/leon",
       "label":"Leon de Vries"}'

# 2. Interior facts
curl -X POST \
  "http://localhost:7001/holonic/holons/https%3A%2F%2Fid.indentia.ai%2Fidentity%2Fperson%2Facme%2Fleon/interior?tenant=acme" \
  -H 'Content-Type: application/json' \
  -d '{"turtle":"<https://id.indentia.ai/identity/person/acme/leon>
                 <http://indentia.ai/core#hasRole>
                 \"Platform Architect\" ."}'

# 3. Boundary (SHACL shape as membrane)
curl -X POST \
  "http://localhost:7001/holonic/holons/https%3A%2F%2Fid.indentia.ai%2Fidentity%2Fperson%2Facme%2Fleon/boundary?tenant=acme" \
  -H 'Content-Type: application/json' \
  -d '{"turtle":"@prefix sh: <http://www.w3.org/ns/shacl#> .
                 <urn:shape:Person> a sh:NodeShape ;
                   sh:targetClass <http://indentia.ai/core#Person> ."}'

# 4. Check readiness
curl -s http://localhost:7001/holonic/health
# → {"available": true, "default_tenant": "acme"}
```

## Python client

`pip install holonic[indentiagraph]` — the upstream Python
package speaks the same protocol. Typical usage:

```python
from holonic import IndentiaGraphBackend, HolonicDataset

backend = IndentiaGraphBackend(
    base_url="http://localhost:7001",
    tenant="acme",
)
ds = HolonicDataset(backend)
ds.add_holon("https://id.indentia.ai/identity/person/acme/leon",
             label="Leon de Vries")
```

## RAG integration

The Enterprise Search orchestration uses `/holonic/*` from a
decision-tree lane (`holonic_lane`) that is selected when the
intent detector classifies a query as `entity_360`,
`multi_source`, `provenance`, `conflict`, or `federation`. The
lane:

1. Resolves the entity IRI via BB25 on the candidate graph.
2. Fetches interior + boundary layers for up to
   `HOLONIC_MAX_HOLONS_PER_QUERY` candidates in parallel.
3. Runs `validate_membrane` per candidate — results with a
   broken boundary are demoted or blocked based on
   `HOLONIC_MEMBRANE_GATE`.

Full integration rationale lives in
`loom/total_picture.md` §5.1 and the audit trail at
`loom/HOLONIC_RAG_AUDIT_TRAIL.md`.

## Caveats

- **Standalone mode only** until the Raft write-path is wired
  through. The startup guard fails loudly when a cluster manager
  is attached.
- **Shape graph must exist** for `OutputPolicyGuard` to function
  — the companion orchestration service ships a
  `bootstrap_shacl_shapes.py` script that loads
  `OutputAnswerShape` into `sources/_/ontology/output_answer_shapes`
  before the first measurement run.
- **SPARQL `INSERT DATA` cannot carry `@prefix`** inside the
  data block. The custom `parse_into` override is the only
  reason `@prefix`-style bootstrapping works.

## See also

- [Graph Algorithms](graph-algorithms.md) — 35 algorithms over
  the LPG projection, usable on holon-derived subgraphs
- [SHACL](shacl.md) — validator used by the boundary layer
- [Bitemporal](bitemporal.md) — the time dimension that composes
  with holonic context graphs
- [Enterprise Search](enterprise-search.md) — RAG orchestration
  that consumes `/holonic/*`
