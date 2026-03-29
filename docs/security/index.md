# Security

IndentiaDB implements a three-layer security model that applies uniformly across all query interfaces — SPARQL, SurrealQL, Elasticsearch-compatible API, REST, and WebSocket. Every request passes through all three layers before data is returned.

!!! note "Trial image"
    The trial image (`ghcr.io/indentiaplatform/indentiadb-trial`) ships without an authentication configuration file, so all endpoints are accessible without credentials by default. Authentication (OIDC, LDAP, JWT) works exactly the same in the trial as in production — mount a configuration file with your chosen provider to enable it. See the [Quick Configuration Reference](#quick-configuration-reference) below for a minimal example.

---

## The Three Layers

### Layer 1: Authentication — WHO are you?

Authentication establishes the identity of the caller. IndentiaDB supports four identity providers:

| Provider | Best For |
|----------|---------|
| **LDAP / Active Directory** | Enterprise environments with existing directory infrastructure |
| **OIDC / Keycloak** | Modern cloud-native deployments, SSO, federated identity |
| **JWT Bearer Tokens** | Service-to-service calls, API keys, programmatic access |
| **HTTP Basic Auth** | Development and testing only — not recommended for production |

Authentication produces a **principal** — a user identity with an associated set of **roles** and **SIDs** (Security Identifiers, Windows-compatible group identifiers from Active Directory).

See [Authentication](authentication.md) for complete configuration reference.

### Layer 2: Authorization — WHAT can you do?

Authorization determines which operations the authenticated principal is allowed to perform. IndentiaDB supports:

- **RBAC (Role-Based Access Control)** — Roles map to permission levels: `None`, `Read`, `Write`, `Admin`.
- **ABAC (Attribute-Based Access Control)** — Attribute-based policies evaluated dynamically at query time.
- **Write validation** — SPARQL UPDATE and SurrealQL write operations are checked against the principal's graph-level write permissions before execution.

The permission hierarchy is strict: each level includes all permissions of levels below it.

```
Admin ⊃ Write ⊃ Read ⊃ None
```

See [Authorization](authorization.md) for the complete permission model.

### Layer 3: ACL Filtering — WHICH data can you see?

ACL (Access Control List) filtering restricts which data the principal can retrieve, regardless of the query. Two scopes apply:

- **Graph-level ACL** — Controls which named graphs are visible to the principal. Invisible graphs are completely excluded from query planning.
- **Triple-level ACL** — Per-triple access control using RDF-star annotations. Individual triples can carry `acl:allowedSid` metadata that restricts them to specific user or group SIDs. Triples without ACL annotations are visible to all principals with graph access.

Triple-level ACL is IndentiaDB's unique security feature — no other database provides per-triple access control at the storage layer.

See [ACL Filtering](acl.md) for the complete ACL model.

---

## Architecture: How the Three Layers Compose

```
Client Request (any protocol)
       │
       ▼
┌─────────────────────────────────────────┐
│  Layer 1: Authentication                │
│                                         │
│  LDAP ──── OIDC ──── JWT ──── Basic    │
│                   │                     │
│  Result: Principal { user, roles, SIDs }│
└──────────────────────┬──────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────┐
│  Layer 2: Authorization (RBAC / ABAC)   │
│                                         │
│  roles → permission level               │
│  Read / Write / Admin check             │
│                                         │
│  Reject: 403 Forbidden                  │
└──────────────────────┬──────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────┐
│  Layer 3: ACL Filtering                 │
│                                         │
│  Graph-level: remove invisible graphs   │
│  from query plan (FROM / FROM NAMED)    │
│                                         │
│  Triple-level: AclDatasetWrapper        │
│  filters per-triple at storage layer    │
│  using Principal.sids intersection      │
│                                         │
│  User never sees ACL annotations in     │
│  results — filtering is transparent     │
└──────────────────────┬──────────────────┘
                       │
                       ▼
              Query Execution
              Result Delivery
```

The three layers are independent. Authentication failure returns `401`. Authorization failure returns `403`. ACL filtering does not fail — it silently removes inaccessible data from results, so users cannot enumerate what they cannot access.

---

## Quick Configuration Reference

A minimal secure configuration:

```toml
# Authentication: OIDC (Keycloak)
[authentication.oidc]
issuer_url  = "https://auth.example.com/realms/myrealm"
client_id   = "indentiadb-client"
audience    = "indentiadb-api"
roles_claim = "realm_access.roles"

# Authorization
[authorization]
default_access = "deny"

[authorization.role_permissions]
admin  = "Admin"
writer = "Write"
reader = "Read"

# ACL: graph-level visibility
[acl.contexts.reader]
visible_graphs         = ["http://example.org/public"]
visible_default_graph  = false

[acl.contexts.admin]
visible_graphs         = ["**"]
visible_default_graph  = true

[acl.role_contexts]
"admin"  = "admin"
"reader" = "reader"
```

---

## Sub-Pages

| Page | Contents |
|------|---------|
| [Authentication](authentication.md) | LDAP, OIDC, JWT, Basic Auth, CLI login, rate limiting |
| [Authorization](authorization.md) | RBAC, ABAC, permission hierarchy, write validation |
| [ACL Filtering](acl.md) | Graph-level ACL, triple-level RDF-star ACL, SID format, audit logging |

---

## HTTP Error Codes

| Code | Meaning | When |
|------|---------|------|
| `401 Unauthorized` | No credentials, expired token, or invalid credentials | No `Authorization` header, token expired, LDAP bind failed |
| `403 Forbidden` | Authenticated but insufficient permission | Role has `Read` but request needs `Write` |
| `429 Too Many Requests` | Rate limit exceeded | Brute-force protection triggered |
