# ACL Filtering

ACL (Access Control List) filtering is the third layer of IndentiaDB's security model and its most distinctive feature. While graph-level ACL is standard practice in triple stores, **triple-level ACL** — per-triple access control embedded directly in RDF-star annotations — is unique to IndentiaDB among open-source databases.

ACL filtering is **transparent**: users never add ACL conditions to their queries, and users cannot enumerate what data they are excluded from. Filtering happens at the storage layer before query execution delivers results.

---

## Graph-Level ACL

Graph-level ACL controls which named graphs are visible to each principal. Invisible graphs are excluded from query planning entirely — they do not appear in `FROM NAMED` enumeration, and triple patterns that would match triples in invisible graphs simply produce no bindings.

### Configuration

```toml
# Define named ACL contexts
[acl.contexts.public_reader]
visible_graphs         = ["http://example.org/public"]
visible_default_graph  = false

[acl.contexts.data_scientist]
visible_graphs         = ["*"]        # all named graphs (not the default graph)
visible_default_graph  = false

[acl.contexts.analyst]
visible_graphs         = [
    "http://example.org/reports",
    "http://example.org/aggregates"
]
visible_default_graph  = false

[acl.contexts.admin]
visible_graphs         = ["**"]       # all graphs including the default graph
visible_default_graph  = true

# Assign contexts to specific actors (by username/subject claim)
[acl.actor_contexts]
"guest"          = "public_reader"
"alice"          = "data_scientist"
"bob"            = "analyst"

# Assign contexts to roles (applies to all principals with that role)
[acl.role_contexts]
"admin"          = "admin"
"writer"         = "data_scientist"
"reader"         = "public_reader"
"data_analyst"   = "analyst"
```

### Visibility Pattern Reference

| Pattern | Meaning |
|---------|---------|
| `"**"` | All graphs including the default (unnamed) graph |
| `"*"` | All named graphs; the default graph is excluded |
| `["<uri1>", "<uri2>"]` | Specific named graphs only; no others are visible |
| `[]` | No graphs visible — effectively no data access |
| `"http://example.org/*"` | All graphs whose IRI starts with the given prefix (wildcard suffix) |

### Actor vs. Role Contexts

- **`actor_contexts`** — binds a specific username (the `sub` claim from JWT, or LDAP username) to a context. Takes precedence over role-based assignment.
- **`role_contexts`** — binds a role name to a context. Applies to all principals whose role list includes the named role.

If a principal matches both an actor context and a role context, the actor context takes precedence.

### FROM / FROM NAMED Rewriting

When a SPARQL query includes explicit `FROM` or `FROM NAMED` clauses, IndentiaDB intersects the requested graphs with the principal's visible graphs. Requested graphs that are not in the visible set are silently removed. If the intersection is empty, the query runs against an empty dataset and returns no results — not an error.

```sparql
# Principal has visible_graphs = ["http://example.org/public"]
# This query requests both public and classified graphs

SELECT ?s ?p ?o
FROM NAMED <http://example.org/public>
FROM NAMED <http://example.org/classified>
WHERE { GRAPH ?g { ?s ?p ?o } }
```

After rewriting: the query runs as if `FROM NAMED <http://example.org/classified>` was never present. The principal sees only results from the public graph.

---

## Triple-Level ACL (The Unique Feature)

Triple-level ACL allows individual triples within a named graph to carry access-control annotations stored as RDF-star quoted triple metadata. A triple annotated with `acl:allowedSid` is only visible to principals whose SID set intersects the allowed SID set. Unannotated triples are visible to all principals with graph access.

This creates a two-dimensional access control matrix: graph-level controls which graphs are accessible, and triple-level controls which rows within a visible graph are accessible.

### ACL Annotation Format

```turtle
PREFIX acl:  <http://indentiadb.io/acl#>
PREFIX ex:   <http://example.org/>

# This triple is restricted to the Finance group (SID S-1-5-21-domain-2001)
<< ex:confidential_report ex:contains ex:financial_data >>
    acl:allowedSid "S-1-5-21-domain-2001" .

# This triple is restricted to the HR group AND the Finance group
<< ex:employee_record ex:hasSalary "75000"^^xsd:decimal >>
    acl:allowedSid "S-1-5-21-domain-2001" ;
    acl:allowedSid "S-1-5-21-domain-2002" .

# Multiple allowed SIDs = access if ANY SID matches (OR logic)

# This triple has no ACL annotation — visible to all principals with graph access
ex:public_report ex:title "Q4 Highlights" .
```

### Setting ACL Annotations via SPARQL INSERT

```sparql
PREFIX acl: <http://indentiadb.io/acl#>
PREFIX ex:  <http://example.org/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

INSERT DATA {
    GRAPH <http://example.org/hr-data> {
        # Salary data: Finance group and HR group only
        << ex:employee_alice ex:hasSalary "82000"^^xsd:decimal >>
            acl:allowedSid "S-1-5-21-domain-2001" ;
            acl:allowedSid "S-1-5-21-domain-2002" .

        # Performance review: HR group only
        << ex:employee_alice ex:performanceScore "4.2"^^xsd:decimal >>
            acl:allowedSid "S-1-5-21-domain-2002" .

        # Bonus amount: Finance group and Executive group only
        << ex:employee_alice ex:bonusAmount "10000"^^xsd:decimal >>
            acl:allowedSid "S-1-5-21-domain-2001" ;
            acl:allowedSid "S-1-5-21-domain-2004" .

        # Public: manager name, department — no ACL restriction
        ex:employee_alice ex:manager "Bob Smith" ;
                          ex:department "Engineering" .
    }
}
```

### Setting ACL Annotations via RID (Numeric Role ID)

For simpler scenarios, use `acl:allowedRid` with a numeric role identifier:

```sparql
PREFIX acl: <http://indentiadb.io/acl#>
PREFIX ex:  <http://example.org/>

INSERT DATA {
    GRAPH <http://example.org/financial> {
        << ex:budget_report ex:totalBudget "5000000"^^xsd:decimal >>
            acl:allowedRid "2001" ;
            acl:allowedRid "2004" .
    }
}
```

RIDs are the RID component of a Windows SID (`S-1-5-21-<domain>-<RID>`). This is a shorthand for cases where you only need to match against a specific sub-authority within the domain.

---

## Transparent Filtering: AclDatasetWrapper

The `AclDatasetWrapper` is a Rust struct that wraps the underlying triple store and intercepts every triple retrieval operation. It:

1. Reads the principal's SID set from the request context (populated by the authentication layer).
2. For each triple retrieved from storage, checks if the triple has an `acl:allowedSid` annotation.
3. If annotated: returns the triple only if `principal.sids ∩ triple.allowedSids ≠ ∅` (any SID match grants access).
4. If unannotated: returns the triple unconditionally (visible to all principals with graph access).
5. Strips the ACL annotations from the triple before delivering it to the query engine — ACL metadata is never visible in query results.

This filtering is applied at the storage layer, before SPARQL evaluation. The SPARQL query engine sees a clean, already-filtered view of the data and never needs to know about ACL annotations.

**Users cannot distinguish whether a triple does not exist or is ACL-filtered.** Both cases produce identical query results (no binding for the filtered triple).

---

## SID Format (Windows-Compatible)

IndentiaDB uses Windows Security Identifier format for all ACL annotations:

```
S-1-5-21-<domain-authority-1>-<domain-authority-2>-<domain-authority-3>-<RID>
```

Example:
```
S-1-5-21-1234567890-2345678901-3456789012-1001   (user SID)
S-1-5-21-1234567890-2345678901-3456789012-1025   (group SID)
```

### PrincipalSidSet Composition

A principal's effective SID set is the union of:
- Their own user SID (from `objectSid` LDAP attribute, or `sub` claim converted to SID format)
- All group SIDs from their AD group memberships (via `group_sid_mapping` in LDAP config)
- All role-derived SIDs (if roles map to SIDs via `role_sid_mapping`)

```toml
[authorization.role_sid_mapping]
"admin"        = "S-1-5-21-domain-9001"
"data_analyst" = "S-1-5-21-domain-9002"
```

### SID Intersection Logic

Access is granted if **any** SID in the principal's SID set matches **any** `acl:allowedSid` annotation on the triple. This is OR logic:

```
access = (principal.sids ∩ triple.allowedSids) ≠ ∅
```

If a triple has two `acl:allowedSid` values — one for Finance and one for HR — then both Finance members AND HR members can see it. There is no AND logic at the SID level; combine graph-level ACL with triple-level ACL to achieve AND-style restrictions.

---

## Practical Example: Multi-Level Data Sensitivity

The following example demonstrates layered ACL in a healthcare scenario:

```turtle
PREFIX acl:    <http://indentiadb.io/acl#>
PREFIX fhir:   <http://hl7.org/fhir/>
PREFIX ex:     <http://example.org/hospital/>

# SID assignments (configured via LDAP group_sid_mapping):
# S-1-5-21-hosp-1001 = Clinicians
# S-1-5-21-hosp-1002 = Billing Department
# S-1-5-21-hosp-1003 = Researchers (anonymized access)
# S-1-5-21-hosp-1004 = Hospital Administrators

# Patient name: visible to clinicians and administrators
<< ex:patient-7842 fhir:name "Jane Doe" >>
    acl:allowedSid "S-1-5-21-hosp-1001" ;
    acl:allowedSid "S-1-5-21-hosp-1004" .

# Diagnosis: visible to clinicians only
<< ex:patient-7842 fhir:condition ex:diabetes-type2 >>
    acl:allowedSid "S-1-5-21-hosp-1001" .

# Billing code: visible to billing and administrators
<< ex:patient-7842 fhir:claim ex:claim-456 >>
    acl:allowedSid "S-1-5-21-hosp-1002" ;
    acl:allowedSid "S-1-5-21-hosp-1004" .

# Anonymized demographic (no ACL): visible to all including researchers
ex:patient-7842 fhir:ageGroup "40-50" ;
                fhir:gender "female" .
```

A researcher running `SELECT * WHERE { ex:patient-7842 ?p ?o }` sees:
- `fhir:ageGroup "40-50"`
- `fhir:gender "female"`

A clinician sees all four properties including name and diagnosis.
The billing department sees age, gender, and the claim — but not the diagnosis.

---

## Audit Logging

All ACL-filtered accesses are optionally logged:

```toml
[audit]
enabled        = true
log_acl_filter = false    # true = log every filtered triple (very high volume)
log_writes     = true
log_auth       = true
output         = "sparql_graph"
```

When `log_acl_filter = true`, every triple that was filtered out for a principal is logged with the principal's identity, the filtered triple's subject/predicate, and the timestamp. This is useful for compliance auditing but generates high log volume in systems with many ACL-annotated triples.

Audit log entries are stored in the named graph `<http://indentiadb.io/audit>` when `output = "sparql_graph"`, queryable via SPARQL:

```sparql
PREFIX audit: <http://indentiadb.io/audit#>

SELECT ?user ?action ?target ?timestamp WHERE {
    GRAPH <http://indentiadb.io/audit> {
        ?event audit:user      ?user ;
               audit:action    ?action ;
               audit:target    ?target ;
               audit:timestamp ?timestamp .
    }
}
ORDER BY DESC(?timestamp)
LIMIT 100
```
