# Authorization

Authorization is the second layer of IndentiaDB's three-layer security model. Once a caller is authenticated (identity established), authorization determines what operations that caller is allowed to perform.

---

## Permission Hierarchy

IndentiaDB defines four permission levels in a strict hierarchy. Each level includes all permissions of every lower level:

```
Admin ⊃ Write ⊃ Read ⊃ None
```

| Level | Includes | Allowed Operations |
|-------|---------|-------------------|
| `None` | — | No access. All requests rejected with 403. |
| `Read` | None | SPARQL SELECT, ASK, CONSTRUCT, DESCRIBE. SurrealQL SELECT. ES `_search`. WebSocket LIVE SELECT (read-only). |
| `Write` | Read | SPARQL INSERT DATA, DELETE DATA, DELETE/INSERT WHERE. SurrealQL CREATE, UPDATE, UPSERT, DELETE, RELATE. ES `_doc` PUT/POST/DELETE, `_bulk`. DEFINE EVENT. |
| `Admin` | Write | Schema changes (DEFINE TABLE, DEFINE INDEX, DEFINE FIELD). Inference re-materialization. Bitemporal purge. Cluster management commands. User and role management. |

!!! note "Multiple Roles"
    A principal may have multiple roles. The effective permission level is the maximum across all assigned roles. A user with both `reader` and `writer` roles has `Write` permission.

---

## RBAC (Role-Based Access Control)

### Role Definition and Assignment

Roles are defined in `config.toml` with a mapping from role name to permission level:

```toml
[authorization]
default_access = "deny"    # "deny" | "allow" — what happens for unauthenticated requests

[authorization.role_permissions]
admin        = "Admin"
writer       = "Write"
reader       = "Read"
data_analyst = "Read"
etl_service  = "Write"
```

Roles are assigned to principals via:
- **LDAP**: `group_role_mapping` in `[authentication.ldap]` — AD group → role
- **OIDC**: `role_mapping` in `[authentication.oidc]` — OIDC claim value → role
- **JWT**: the `roles_claim` in the token → role lookup in `role_permissions`
- **Basic Auth**: `roles` array in the user definition

### `default_access`

| Value | Behavior |
|-------|---------|
| `"deny"` | Requests from authenticated users with no matching role receive `403`. Unauthenticated requests receive `401`. |
| `"allow"` | Requests from authenticated users with no matching role receive `Read` access. Use only for public data environments. |

!!! warning "Always Use default_access = deny in Production"
    Setting `default_access = "allow"` grants read access to any authenticated user regardless of role. In enterprise environments with an OIDC provider that issues tokens to all employees, this exposes all read-accessible data to all staff. Configure explicit role mappings instead.

### Role Assignment via LDAP

```toml
[authentication.ldap.group_role_mapping]
"CN=IndentiaAdmins,OU=Groups,DC=corp,DC=example,DC=com"   = "admin"
"CN=DataEngineers,OU=Groups,DC=corp,DC=example,DC=com"    = "writer"
"CN=Analysts,OU=Groups,DC=corp,DC=example,DC=com"         = "reader"
"CN=ETLServices,OU=Groups,DC=corp,DC=example,DC=com"      = "etl_service"
```

### Role Assignment via OIDC

```toml
[authentication.oidc.role_mapping]
"indentia-admin"   = "admin"
"indentia-write"   = "writer"
"indentia-read"    = "reader"
"service-account"  = "etl_service"
```

The OIDC claim path `roles_claim = "realm_access.roles"` (for Keycloak) is a dot-separated path into the JWT payload. For a flat `roles` array in the JWT, use `roles_claim = "roles"`.

---

## ABAC (Attribute-Based Access Control)

ABAC policies are evaluated dynamically at query time and can make decisions based on arbitrary attributes of the request, the principal, and the data being accessed.

### Defining ABAC Policies

ABAC policies are defined as SPARQL-based rules in `config.toml` or a referenced policy file:

```toml
[authorization.abac]
enabled      = true
policy_file  = "config/abac-policies.sparql"
```

Policy file (`config/abac-policies.sparql`):

```sparql
# Policy: Users can only write to their own tenant's graph
PREFIX ex:   <http://example.org/>
PREFIX acl:  <http://indentiadb.io/acl#>

DEFINE POLICY write_own_tenant
  FOR WRITE ON GRAPH ?graph
  ALLOW WHEN {
      # The principal's tenant claim must match the graph's tenant
      BIND(acl:claim("tenant_id") AS ?userTenant)
      ?graph ex:belongsToTenant ?graphTenant .
      FILTER(?userTenant = STR(?graphTenant))
  }
```

```sparql
# Policy: Data analysts can only query data older than 90 days
PREFIX ex:  <http://example.org/>
PREFIX acl: <http://indentiadb.io/acl#>

DEFINE POLICY analyst_data_freshness
  FOR READ ON GRAPH <http://example.org/live-data>
  ALLOW WHEN {
      BIND(acl:has_role("data_analyst") AS ?isAnalyst)
      FILTER(!?isAnalyst)  # Allow non-analysts unconditionally
      # Analysts require data older than 90 days
      BIND(acl:claim("created_at") AS ?ts)
      FILTER(?ts < (NOW() - "P90D"^^xsd:duration))
  }
```

ABAC policies are evaluated after RBAC. If RBAC grants sufficient permission, ABAC policies can further restrict access based on data attributes. ABAC cannot grant permissions beyond the RBAC level — it can only narrow them.

---

## Write Access Control

### SPARQL UPDATE Validation

Before executing a SPARQL UPDATE statement, IndentiaDB validates that the authenticated principal has `Write` permission on all target graphs:

```sparql
# This UPDATE will be rejected if the principal does not have Write on
# <http://example.org/financial-data>
INSERT DATA {
    GRAPH <http://example.org/financial-data> {
        ex:q4report ex:amount 1500000 .
    }
}
```

If the principal has `Write` on some target graphs but not others, the entire UPDATE is rejected atomically — partial writes do not occur.

### Graph-Level Write Verification

Write permissions are checked at two levels:

1. **Role permission level** — the principal must have `Write` or `Admin` from RBAC.
2. **Graph-level ACL visibility** — the target graph must be in the principal's visible graph set. A graph that is not visible for reading is also not writable.

```toml
# Example: writer role can see and write to specific graphs
[acl.contexts.writer_context]
visible_graphs        = ["http://example.org/data", "http://example.org/staging"]
visible_default_graph = false

[acl.role_contexts]
"writer" = "writer_context"
```

A principal with the `writer` role can only INSERT or DELETE triples in `http://example.org/data` and `http://example.org/staging`. Attempts to write to any other graph receive `403 Forbidden`.

### Default Graph Access Control

The default graph (the unnamed graph in SPARQL queries without `GRAPH` clauses) requires explicit `visible_default_graph = true` in the ACL context. This prevents accidental writes to the default graph from applications that omit the named graph specification.

### Atomic Update Rejection on Permission Failure

If a SPARQL UPDATE or SurrealQL transaction targets multiple graphs and the principal lacks permission on any one of them, the entire transaction is rejected before any write occurs. This ensures write atomicity and prevents partial-update inconsistencies.

```sparql
# If the principal has Write on graph:A but not on graph:B,
# this entire transaction is rejected — graph:A is NOT modified
DELETE { GRAPH <http://example.org/A> { ex:alice ex:status "old" . } }
INSERT { GRAPH <http://example.org/A> { ex:alice ex:status "new" . } }
WHERE  { }
;
INSERT DATA {
    GRAPH <http://example.org/B> {
        ex:log ex:entry "alice status changed" .
    }
}
```

Result: `403 Forbidden` with error message indicating which graph lacks permission. Neither graph is modified.

---

## Permission Audit

All authorization decisions can be logged to the audit trail:

```toml
[audit]
enabled          = true
log_auth         = true     # Log all 401/403 events
log_writes       = true     # Log all successful Write/Admin operations
log_reads        = false    # Log all successful Read operations (high volume)
```

Authorization failure log entry:

```json
{
  "event":       "authorization_failure",
  "timestamp":   "2025-11-14T09:23:41.882Z",
  "user":        "alice@example.com",
  "roles":       ["reader"],
  "operation":   "SPARQL_UPDATE",
  "target_graph": "http://example.org/financial-data",
  "reason":      "role 'reader' has permission 'Read'; required 'Write'",
  "request_id":  "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "client_ip":   "10.0.0.55"
}
```
