# SHACL Validation

IndentiaDB includes a native SHACL (Shapes Constraint Language) validation engine that enforces data quality rules on RDF graphs. The engine implements the W3C SHACL Core specification and extends it with SPARQL-based constraints from the SHACL 1.2 draft, allowing you to define shape graphs that describe the expected structure of your data and validate incoming triples against those shapes before they are committed to the store.

---

## How SHACL Works

SHACL validation operates on two graphs:

- **Data graph** -- the RDF triples you want to validate.
- **Shapes graph** -- a set of _shape_ definitions that describe valid data structures.

The validation engine selects _focus nodes_ from the data graph based on targets declared in each shape, then checks every applicable constraint. The result is a **validation report** that either confirms conformance or lists individual violations.

```
┌──────────────────────┐      ┌──────────────────────┐
│     Shapes Graph     │      │      Data Graph      │
│  ┌────────────────┐  │      │                      │
│  │  NodeShape     │──┼──────┼──▶ Focus Node        │
│  │  PropertyShape │  │      │     ├─ property A     │
│  └────────────────┘  │      │     ├─ property B     │
│                      │      │     └─ property C     │
└──────────────────────┘      └──────────────────────┘
            │                           │
            ▼                           ▼
   ┌────────────────────────────────────────────────┐
   │          SHACL Validation Engine               │
   │   select focus nodes → apply constraints       │
   │   → collect results  → produce report          │
   └────────────────────────────────────────────────┘
                        │
                        ▼
              ValidationReport
              { conforms: true/false,
                results: [...] }
```

---

## Supported Constraints

IndentiaDB supports the full SHACL Core constraint vocabulary plus SPARQL constraints:

| Category | Constraints | SHACL Properties |
|----------|-------------|------------------|
| Cardinality | Minimum / maximum value count | `sh:minCount`, `sh:maxCount` |
| Datatype | Literal type checking | `sh:datatype` |
| Class | Instance-of checking | `sh:class` |
| Node Kind | IRI / BlankNode / Literal | `sh:nodeKind` |
| Value Range | Numeric and date bounds | `sh:minInclusive`, `sh:maxInclusive`, `sh:minExclusive`, `sh:maxExclusive` |
| String | Length and pattern | `sh:minLength`, `sh:maxLength`, `sh:pattern`, `sh:flags` |
| Enumeration | Allowed values list | `sh:in`, `sh:hasValue` |
| Language | Language tags | `sh:languageIn`, `sh:uniqueLang` |
| Logical | Boolean combinations | `sh:and`, `sh:or`, `sh:not`, `sh:xone` |
| Closed Shape | Restrict allowed properties | `sh:closed`, `sh:ignoredProperties` |
| Comparison | Cross-property checks | `sh:equals`, `sh:disjoint`, `sh:lessThan`, `sh:lessThanOrEquals` |
| Qualified | Conditional cardinality | `sh:qualifiedValueShape`, `sh:qualifiedMinCount`, `sh:qualifiedMaxCount` |
| SPARQL (1.2) | Custom SPARQL SELECT constraints | `sh:sparql`, `sh:select` |

---

## Defining Shapes

### Node Shapes

A node shape defines constraints on a focus node itself. Use `sh:targetClass` to select all instances of a given class:

```turtle
@prefix sh:     <http://www.w3.org/ns/shacl#> .
@prefix schema: <http://schema.org/> .
@prefix xsd:    <http://www.w3.org/2001/XMLSchema#> .
@prefix ex:     <http://example.org/shapes/> .

ex:PersonShape
    a sh:NodeShape ;
    sh:targetClass schema:Person ;
    sh:property ex:PersonNameShape ;
    sh:property ex:PersonEmailShape ;
    sh:property ex:PersonAgeShape .
```

### Property Shapes

A property shape defines constraints on the values reached through a property path from the focus node:

```turtle
ex:PersonNameShape
    a sh:PropertyShape ;
    sh:path schema:name ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
    sh:maxLength 200 ;
    sh:message "Every person must have exactly one name (1-200 characters)" .

ex:PersonEmailShape
    a sh:PropertyShape ;
    sh:path schema:email ;
    sh:minCount 1 ;
    sh:nodeKind sh:Literal ;
    sh:pattern "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$" ;
    sh:message "Email must be a valid email address" .

ex:PersonAgeShape
    a sh:PropertyShape ;
    sh:path schema:age ;
    sh:maxCount 1 ;
    sh:datatype xsd:integer ;
    sh:minInclusive 0 ;
    sh:maxInclusive 150 ;
    sh:severity sh:Warning ;
    sh:message "Age must be between 0 and 150" .
```

### Target Declarations

IndentiaDB supports all four SHACL target types:

```turtle
# Target all instances of a class
ex:PersonShape sh:targetClass schema:Person .

# Target a specific node
ex:AliceShape sh:targetNode <http://example.org/alice> .

# Target all subjects that use a predicate
ex:HasNameShape sh:targetSubjectsOf schema:name .

# Target all objects of a predicate
ex:NameValueShape sh:targetObjectsOf schema:name .
```

!!! tip "Shapes Without Targets"
    Shapes that do not declare any target are treated as _value shapes_. They are never validated on their own but can be referenced from other shapes via `sh:node` or `sh:qualifiedValueShape`.

---

## Property Path Expressions

IndentiaDB evaluates the full range of SHACL property paths, enabling validation of values reached through complex graph traversals:

| Path Type | Syntax | Example | Description |
|-----------|--------|---------|-------------|
| Predicate | `sh:path schema:name` | Direct property | Single predicate hop |
| Inverse | `sh:path [ sh:inversePath schema:parent ]` | `^schema:parent` | Reverse direction |
| Sequence | `sh:path ( schema:address schema:city )` | `schema:address / schema:city` | Multi-hop path |
| Alternative | `sh:path [ sh:alternativePath ( schema:name schema:givenName ) ]` | `schema:name \| schema:givenName` | Either path |
| Zero-or-more | `sh:path [ sh:zeroOrMorePath schema:parent ]` | `schema:parent*` | Transitive closure |
| One-or-more | `sh:path [ sh:oneOrMorePath schema:parent ]` | `schema:parent+` | At least one hop |
| Zero-or-one | `sh:path [ sh:zeroOrOnePath schema:parent ]` | `schema:parent?` | Optional hop |

**Example -- validate that every person has a city in their address:**

```turtle
ex:PersonCityShape
    a sh:PropertyShape ;
    sh:path ( schema:address schema:city ) ;
    sh:minCount 1 ;
    sh:datatype xsd:string ;
    sh:message "Person must have a city in their address" .
```

!!! warning "Repetition Path Limits"
    Zero-or-more (`*`) and one-or-more (`+`) paths can traverse very large subgraphs. IndentiaDB enforces a configurable `max_path_steps` limit (default: 50,000) to prevent unbounded expansion. If this limit is reached, validation returns a `ResourceLimitExceeded` error.

---

## Logical Constraints

Combine shapes using boolean logic for complex validation rules:

```turtle
# AND: value must satisfy all listed shapes
ex:FullNameShape
    a sh:PropertyShape ;
    sh:path schema:name ;
    sh:and (
        [ sh:minLength 2 ]
        [ sh:maxLength 100 ]
        [ sh:pattern "^[A-Z]" ]
    ) ;
    sh:message "Name must be 2-100 chars and start with uppercase" .

# OR: value must satisfy at least one shape
ex:ContactInfoShape
    a sh:PropertyShape ;
    sh:path schema:contactPoint ;
    sh:or (
        [ sh:datatype xsd:string ; sh:pattern "^\\+?[0-9\\-\\s]+$" ]
        [ sh:datatype xsd:string ; sh:pattern "^[^@]+@[^@]+$" ]
    ) ;
    sh:message "Contact must be a phone number or email" .

# NOT: value must not satisfy the shape
ex:NotRetiredShape
    a sh:PropertyShape ;
    sh:path schema:status ;
    sh:not [ sh:hasValue "retired" ] .

# XONE: value must satisfy exactly one shape
ex:IdentifierShape
    a sh:PropertyShape ;
    sh:path schema:identifier ;
    sh:xone (
        [ sh:pattern "^[0-9]{9}$" ]
        [ sh:pattern "^[A-Z]{2}[0-9]{6}$" ]
    ) ;
    sh:message "Identifier must be either a 9-digit number or a 2-letter + 6-digit code" .
```

---

## Closed Shapes

Restrict which properties a node may have:

```turtle
ex:StrictPersonShape
    a sh:NodeShape ;
    sh:targetClass schema:Person ;
    sh:closed true ;
    sh:ignoredProperties ( rdf:type ) ;
    sh:property [
        sh:path schema:name ;
        sh:minCount 1 ;
    ] ;
    sh:property [
        sh:path schema:email ;
    ] .
```

With `sh:closed true`, any property on a `schema:Person` node that is not declared as a `sh:property` path (and not in `sh:ignoredProperties`) triggers a violation.

---

## Severity Levels

Each shape or property shape can declare a severity level that controls how violations are reported:

| Severity | IRI | Meaning |
|----------|-----|---------|
| Violation | `sh:Violation` | Data does not conform (default) |
| Warning | `sh:Warning` | Non-critical issue |
| Info | `sh:Info` | Informational notice |

```turtle
ex:DeprecatedFieldShape
    a sh:PropertyShape ;
    sh:path ex:legacyField ;
    sh:maxCount 0 ;
    sh:severity sh:Warning ;
    sh:message "legacyField is deprecated; migrate to ex:newField" .
```

!!! note "Conformance and Severity"
    Per the W3C SHACL specification, only `sh:Violation` results affect conformance. A report with only warnings and infos still has `conforms: true`.

---

## Validation Endpoint

IndentiaDB exposes a REST endpoint for SHACL validation:

### Load Shapes

```bash
curl -X POST http://localhost:7001/shacl/shapes \
  -H "Content-Type: text/turtle" \
  -H "Authorization: Bearer $TOKEN" \
  -d '@shapes.ttl'
```

**Response:**

```json
{
  "loaded": 3,
  "shape_ids": [
    "http://example.org/shapes/PersonShape",
    "http://example.org/shapes/PersonNameShape",
    "http://example.org/shapes/PersonEmailShape"
  ]
}
```

### Validate Data

```bash
curl -X POST http://localhost:7001/shacl/validate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "graph": "http://example.org/data",
    "shapes": ["http://example.org/shapes/PersonShape"]
  }'
```

**Response (conforming):**

```json
{
  "conforms": true,
  "results": [],
  "stats": {
    "shapes_evaluated": 1,
    "focus_nodes_validated": 42,
    "constraints_checked": 126,
    "duration_ms": 12
  }
}
```

**Response (non-conforming):**

```json
{
  "conforms": false,
  "results": [
    {
      "focusNode": "http://example.org/person/99",
      "resultPath": "http://schema.org/name",
      "sourceShape": "http://example.org/shapes/PersonNameShape",
      "sourceConstraintComponent": "http://www.w3.org/ns/shacl#MinCountConstraintComponent",
      "resultSeverity": "http://www.w3.org/ns/shacl#Violation",
      "resultMessage": "Every person must have exactly one name (1-200 characters)",
      "value": null
    },
    {
      "focusNode": "http://example.org/person/42",
      "resultPath": "http://schema.org/email",
      "sourceShape": "http://example.org/shapes/PersonEmailShape",
      "sourceConstraintComponent": "http://www.w3.org/ns/shacl#PatternConstraintComponent",
      "resultSeverity": "http://www.w3.org/ns/shacl#Violation",
      "resultMessage": "Email must be a valid email address",
      "value": {
        "type": "literal",
        "value": "not-an-email"
      }
    }
  ],
  "stats": {
    "shapes_evaluated": 1,
    "focus_nodes_validated": 42,
    "constraints_checked": 126,
    "duration_ms": 18
  }
}
```

### Validate Inline Data

Send both shapes and data in one request:

```bash
curl -X POST http://localhost:7001/shacl/validate-inline \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "shapes_format": "turtle",
    "shapes": "@prefix sh: <http://www.w3.org/ns/shacl#> ...",
    "data_format": "turtle",
    "data": "@prefix schema: <http://schema.org/> ..."
  }'
```

---

## Validate-Before-Write

IndentiaDB can enforce SHACL validation on every SPARQL INSERT operation. When enabled, the engine validates the incoming triples against all loaded shapes _before_ committing them to the store. If any violation with severity `sh:Violation` is found, the INSERT is rejected and the full validation report is returned as an error.

### Enable via Configuration

```toml
[shacl]
enabled             = true
validate_on_insert  = true      # reject INSERTs that violate loaded shapes
strict_mode         = true      # also reject on sh:Warning (optional)
```

### Enable via REST

```bash
curl -X PUT http://localhost:7001/shacl/config \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "validate_on_insert": true,
    "strict_mode": false
  }'
```

When `validate_on_insert` is active, a SPARQL INSERT that would create invalid data returns HTTP 422:

```bash
curl -X POST http://localhost:7001/sparql \
  -H "Content-Type: application/sparql-update" \
  -H "Authorization: Bearer $TOKEN" \
  -d 'INSERT DATA {
    <http://example.org/person/new> a <http://schema.org/Person> .
  }'
```

```json
{
  "error": "SHACL validation failed",
  "conforms": false,
  "results": [
    {
      "focusNode": "http://example.org/person/new",
      "resultPath": "http://schema.org/name",
      "sourceConstraintComponent": "http://www.w3.org/ns/shacl#MinCountConstraintComponent",
      "resultMessage": "Every person must have exactly one name (1-200 characters)"
    }
  ]
}
```

!!! tip "Performance Impact"
    Validate-before-write adds latency to every INSERT. For bulk data loading, consider disabling it temporarily and running a full validation pass after the load completes.

---

## SPARQL Constraints (SHACL 1.2)

IndentiaDB supports SPARQL-based constraints from the SHACL 1.2 draft. These let you write arbitrary SPARQL SELECT queries as validation rules:

```turtle
ex:UniqueEmailShape
    a sh:NodeShape ;
    sh:targetClass schema:Person ;
    sh:sparql [
        sh:message "Email address must be unique across all persons" ;
        sh:select """
            SELECT $this (schema:email AS ?path) ?value
            WHERE {
                $this schema:email ?value .
                ?other schema:email ?value .
                FILTER(?other != $this)
            }
        """ ;
    ] .
```

Each solution returned by the SELECT query is treated as one constraint violation. The query receives `$this` bound to the current focus node.

!!! note "SPARQL Executor Required"
    SPARQL constraints require the query engine to be available. The SHACL engine calls a `SparqlExecutor` implementation that routes queries through IndentiaDB's QLever-compatible SPARQL engine.

---

## Validation Reports as RDF

Validation reports can be serialized to RDF quads using the standard SHACL vocabulary, making them queryable with SPARQL:

```bash
curl -X POST http://localhost:7001/shacl/validate \
  -H "Accept: text/turtle" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{ "graph": "http://example.org/data" }'
```

```turtle
_:report0 a sh:ValidationReport ;
    sh:conforms "false"^^xsd:boolean ;
    sh:result _:result0 .

_:result0 a sh:ValidationResult ;
    sh:focusNode <http://example.org/person/99> ;
    sh:resultPath schema:name ;
    sh:sourceShape <http://example.org/shapes/PersonNameShape> ;
    sh:sourceConstraintComponent sh:MinCountConstraintComponent ;
    sh:resultSeverity sh:Violation ;
    sh:resultMessage "Every person must have exactly one name (1-200 characters)" .
```

You can also persist reports to the store for audit purposes:

```bash
curl -X POST http://localhost:7001/shacl/validate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "graph": "http://example.org/data",
    "persist_report": true,
    "report_graph": "http://example.org/validation-reports"
  }'
```

---

## SurrealDB Schema for SHACL Storage

The SHACL engine persists shape definitions and validation history in three SurrealDB tables:

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `shacl_shape` | Stored NodeShape definitions | `shape_id`, `shape` (flexible object), `created_at`, `updated_at` |
| `shacl_validation` | Validation run metadata | `validation_id`, `conforms`, `stats`, `results_count`, `report`, `created_at` |
| `shacl_result` | Flattened validation results | `validation_id`, `focus_node`, `result_path`, `value`, `source_shape`, `severity`, `message` |

**Indexes:**

| Index | Table | Fields |
|-------|-------|--------|
| `idx_shacl_shape_id` | `shacl_shape` | `shape_id` (UNIQUE) |
| `idx_shacl_validation_id` | `shacl_validation` | `validation_id` (UNIQUE) |
| `idx_shacl_validation_created_at` | `shacl_validation` | `created_at` |
| `idx_shacl_result_validation` | `shacl_result` | `validation_id` |
| `idx_shacl_result_focus` | `shacl_result` | `focus_node` |
| `idx_shacl_result_severity` | `shacl_result` | `severity` |

Query validation history with SurrealQL:

```sql
-- List recent validation runs
SELECT validation_id, conforms, results_count, created_at
FROM shacl_validation
ORDER BY created_at DESC
LIMIT 10;

-- Get all violations for a specific node
SELECT *
FROM shacl_result
WHERE focus_node = "http://example.org/person/99"
  AND severity = "http://www.w3.org/ns/shacl#Violation"
ORDER BY created_at DESC;
```

---

## Configuration

### Server Configuration (TOML)

```toml
[shacl]
# Enable the SHACL validation engine
enabled = true

# Reject SPARQL INSERTs that violate loaded shapes
validate_on_insert = false

# Also reject on sh:Warning (not just sh:Violation)
strict_mode = false

# Validation timeout per run (seconds)
timeout = 10

# Maximum recursion depth for nested shapes (sh:node, logical constraints)
max_shape_depth = 16

# Maximum focus nodes validated per shape
max_focus_nodes = 100000

# Maximum value nodes returned by a property path evaluation
max_value_nodes = 10000

# Maximum graph expansion steps for repetition paths (*, +)
max_path_steps = 50000

# Maximum validation results per report
max_results = 10000

# Include warnings and infos in the report
include_warnings = true
include_infos = true

# Optional named graph filter (validate only this graph)
# graph_iri = "http://example.org/data"
```

### Configuration Reference

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `enabled` | bool | `true` | Enable/disable the SHACL engine |
| `validate_on_insert` | bool | `false` | Enforce shape validation on SPARQL INSERT |
| `strict_mode` | bool | `false` | Treat `sh:Warning` as a conformance failure |
| `timeout` | duration | `10s` | Maximum duration for a full validation run |
| `max_shape_depth` | int | `16` | Maximum nesting depth for recursive shapes |
| `max_focus_nodes` | int | `100,000` | Cap on focus nodes per shape |
| `max_value_nodes` | int | `10,000` | Cap on values returned by a single path evaluation |
| `max_path_steps` | int | `50,000` | Cap on graph traversal steps for repetition paths |
| `max_results` | int | `10,000` | Maximum results in a single report |
| `include_warnings` | bool | `true` | Include `sh:Warning` results |
| `include_infos` | bool | `true` | Include `sh:Info` results |
| `graph_iri` | string | (none) | Restrict validation to a specific named graph |

!!! warning "Resource Limits Are Safety Guards"
    The `max_*` parameters exist to prevent accidental or malicious denial-of-service via expensive shape definitions. Raising them beyond the defaults should be done carefully and only after profiling your workload.

---

## Python Client Example

```python
import requests

BASE_URL = "http://localhost:7001"
HEADERS = {"Authorization": "Bearer <token>"}

# 1. Load shapes
shapes_ttl = """
@prefix sh:     <http://www.w3.org/ns/shacl#> .
@prefix schema: <http://schema.org/> .
@prefix xsd:    <http://www.w3.org/2001/XMLSchema#> .
@prefix ex:     <http://example.org/shapes/> .

ex:PersonShape
    a sh:NodeShape ;
    sh:targetClass schema:Person ;
    sh:property [
        sh:path schema:name ;
        sh:minCount 1 ;
        sh:maxCount 1 ;
        sh:datatype xsd:string ;
    ] ;
    sh:property [
        sh:path schema:email ;
        sh:minCount 1 ;
        sh:pattern "^[^@]+@[^@]+$" ;
    ] .
"""

resp = requests.post(
    f"{BASE_URL}/shacl/shapes",
    headers={**HEADERS, "Content-Type": "text/turtle"},
    data=shapes_ttl,
)
print(f"Loaded shapes: {resp.json()}")

# 2. Insert some data
insert_sparql = """
INSERT DATA {
    <http://example.org/person/1> a <http://schema.org/Person> ;
        <http://schema.org/name> "Alice" ;
        <http://schema.org/email> "alice@example.org" .
    <http://example.org/person/2> a <http://schema.org/Person> ;
        <http://schema.org/email> "not-an-email" .
}
"""

requests.post(
    f"{BASE_URL}/sparql",
    headers={**HEADERS, "Content-Type": "application/sparql-update"},
    data=insert_sparql,
)

# 3. Validate
resp = requests.post(
    f"{BASE_URL}/shacl/validate",
    headers={**HEADERS, "Content-Type": "application/json"},
    json={"shapes": ["http://example.org/shapes/PersonShape"]},
)

report = resp.json()
if report["conforms"]:
    print("All data conforms to shapes")
else:
    print(f"Found {len(report['results'])} violation(s):")
    for r in report["results"]:
        print(f"  - {r['focusNode']}: {r.get('resultMessage', 'constraint violated')}")
```

---

## Shape Format Support

The SHACL parser accepts shapes in multiple RDF serialization formats:

| Format | Content-Type | File Extension |
|--------|-------------|----------------|
| Turtle | `text/turtle` | `.ttl` |
| JSON-LD | `application/ld+json` | `.jsonld` |
| RDF/XML | `application/rdf+xml` | `.rdf` |

!!! tip "Turtle Is Recommended"
    Turtle is the most readable format for SHACL shape definitions and is used in most W3C examples. Use JSON-LD if you need to integrate with JSON-based tooling.

---

## Interpreting Validation Reports

Each `ValidationResult` in a report contains the following fields:

| Field | Description |
|-------|-------------|
| `focusNode` | The IRI of the node that was validated |
| `resultPath` | The property path that was evaluated (if applicable) |
| `value` | The value that caused the violation (if applicable) |
| `sourceShape` | The IRI of the shape that defined the constraint |
| `sourceConstraintComponent` | The IRI identifying the type of constraint (e.g., `sh:MinCountConstraintComponent`) |
| `resultSeverity` | `sh:Violation`, `sh:Warning`, or `sh:Info` |
| `resultMessage` | Human-readable explanation (from `sh:message` on the shape, or auto-generated) |

**Common constraint component IRIs:**

| Constraint Component | Meaning |
|---------------------|---------|
| `sh:MinCountConstraintComponent` | Too few values |
| `sh:MaxCountConstraintComponent` | Too many values |
| `sh:DatatypeConstraintComponent` | Wrong literal datatype |
| `sh:ClassConstraintComponent` | Wrong rdf:type |
| `sh:NodeKindConstraintComponent` | Wrong node kind (IRI/BlankNode/Literal) |
| `sh:PatternConstraintComponent` | String does not match regex |
| `sh:MinInclusiveConstraintComponent` | Value below minimum |
| `sh:MaxInclusiveConstraintComponent` | Value above maximum |
| `sh:InConstraintComponent` | Value not in allowed set |
| `sh:ClosedConstraintComponent` | Unexpected property on closed shape |
| `sh:SPARQLConstraintComponent` | Custom SPARQL constraint violated |

---

## Performance Considerations

- **Shape complexity**: Shapes with deep nesting (`sh:node` referencing shapes with their own `sh:node`) multiply the validation cost. Keep nesting depth below 4-5 levels for interactive workloads.
- **Broad targets**: `sh:targetClass` on a class with millions of instances validates every instance. Use `max_focus_nodes` to cap this, or prefer `sh:targetNode` for spot-checks.
- **Repetition paths**: `sh:zeroOrMorePath` and `sh:oneOrMorePath` perform BFS traversal and can visit the entire graph. The `max_path_steps` limit prevents runaway expansion.
- **SPARQL constraints**: Custom SPARQL queries run against the full data graph. Index the predicates used in your constraint queries for best performance.
- **Batch validation**: When loading large datasets, disable `validate_on_insert`, load all data, then run a single validation pass. This is orders of magnitude faster than per-triple validation.
