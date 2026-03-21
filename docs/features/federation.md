# Federated Queries

IndentiaDB can act as a federated query hub, transparently querying remote SPARQL endpoints, virtual SQL-to-RDF graphs, and its own local triple store in a single SPARQL query. Results are merged and returned to the client as if all data lived in one place.

---

## SPARQL SERVICE Clause

The SPARQL `SERVICE` clause delegates a sub-query to a named remote endpoint. IndentiaDB sends the sub-query to the remote endpoint over HTTP, collects the results, and joins them with the local results.

### Basic Federated Query

```sparql
PREFIX foaf:   <http://xmlns.com/foaf/0.1/>
PREFIX schema: <http://schema.org/>

SELECT ?person ?name ?description WHERE {
    # Local data: people in IndentiaDB
    ?person a foaf:Person ;
            foaf:name ?name .

    # Remote data: description from DBpedia
    SERVICE <https://dbpedia.org/sparql> {
        ?person schema:description ?description .
        FILTER(lang(?description) = "en")
    }
}
LIMIT 20
```

!!! note "SERVICE Endpoint Must Be Reachable"
    The endpoint URI in `SERVICE` must be accessible from the machine running IndentiaDB. In Kubernetes deployments, ensure egress network policies allow outbound HTTP/HTTPS to the remote endpoint.

### SERVICE SILENT (Fault-Tolerant Federation)

Add `SILENT` to continue with local results even if the remote endpoint is unavailable or returns an error:

```sparql
PREFIX foaf:   <http://xmlns.com/foaf/0.1/>
PREFIX owl:    <http://www.w3.org/2002/07/owl#>

SELECT ?person ?name ?sameAs WHERE {
    ?person a foaf:Person ;
            foaf:name ?name .

    # Try to fetch sameAs links from Wikidata; silently skip if unavailable
    OPTIONAL {
        SERVICE SILENT <https://query.wikidata.org/sparql> {
            ?wikidataItem owl:sameAs ?person .
            BIND(?wikidataItem AS ?sameAs)
        }
    }
}
```

If the remote endpoint times out or returns an error, `?sameAs` is simply unbound — the query succeeds with local data only.

### Federated Query with DBpedia

```sparql
PREFIX dbo:    <http://dbpedia.org/ontology/>
PREFIX dbr:    <http://dbpedia.org/resource/>
PREFIX foaf:   <http://xmlns.com/foaf/0.1/>
PREFIX ex:     <http://example.org/>

SELECT ?researcher ?name ?birthDate ?institution ?hIndex WHERE {
    # Local: researchers and their h-index (stored locally)
    ?researcher a ex:Researcher ;
                foaf:name ?name ;
                ex:hIndex ?hIndex .
    FILTER(?hIndex > 20)

    # Remote: biographical data from DBpedia
    SERVICE <https://dbpedia.org/sparql> {
        ?researcher dbo:birthDate  ?birthDate .
        OPTIONAL { ?researcher dbo:institution ?institution . }
    }
}
ORDER BY DESC(?hIndex)
LIMIT 10
```

### Multiple SERVICE Clauses in One Query

```sparql
PREFIX foaf:   <http://xmlns.com/foaf/0.1/>
PREFIX dbo:    <http://dbpedia.org/ontology/>
PREFIX wd:     <http://www.wikidata.org/entity/>
PREFIX wdt:    <http://www.wikidata.org/prop/direct/>
PREFIX ex:     <http://example.org/>

SELECT ?person ?name ?birthDate ?occupation ?awards WHERE {
    # Local store
    ?person a foaf:Person ;
            foaf:name ?name .

    # DBpedia for biographical facts
    OPTIONAL {
        SERVICE <https://dbpedia.org/sparql> {
            ?person dbo:birthDate ?birthDate .
            OPTIONAL { ?person dbo:occupation ?occupation . }
        }
    }

    # Wikidata for awards
    OPTIONAL {
        SERVICE SILENT <https://query.wikidata.org/sparql> {
            ?wikidataItem wdt:P31 wd:Q5 ;
                          wdt:P166 ?awards .
            FILTER(STR(?wikidataItem) = STR(?person))
        }
    }
}
LIMIT 25
```

IndentiaDB executes the sub-queries in parallel when possible, then performs an in-process join on the results.

---

## Source Types

| Source | Implementation | Protocol | Description |
|--------|---------------|----------|-------------|
| **LocalTripleSource** | Native | Direct | The local IndentiaDB triple store. Always available. |
| **SparqlTripleSource** | HTTP/HTTPS | SPARQL 1.1 | Any remote SPARQL endpoint (DBpedia, Wikidata, Stardog, Virtuoso, Qlever, etc.) |
| **SQL Database** | R2RML | JDBC-style | Relational DB exposed as virtual RDF triples via R2RML mapping |
| **REST API** | Planned | HTTP+JSON | REST-to-RDF bridge for REST APIs without a SPARQL interface |

---

## Rust API for Federation

Configure federation sources programmatically when embedding IndentiaDB in a Rust application:

```rust
use indentiagraph_federation::{
    LocalTripleSource, SparqlTripleSource, SourceCapabilities,
    FederationRegistry,
};
use std::sync::Arc;

// Local store source
let local = LocalTripleSource::new(
    "local".into(),
    store.clone(),
    SourceCapabilities::local_store(),
);

// Remote SPARQL endpoint (DBpedia)
let dbpedia = SparqlTripleSource::new(
    "dbpedia".into(),
    "https://dbpedia.org/sparql".into(),
    None,  // Optional: HTTP client with custom TLS/auth config
    SourceCapabilities::sparql_endpoint(),
)?;

// Remote SPARQL endpoint requiring authentication
let internal_endpoint = SparqlTripleSource::new(
    "internal".into(),
    "https://sparql.internal.example.com/query".into(),
    Some(SparqlHttpConfig {
        bearer_token:      Some(std::env::var("SPARQL_TOKEN")?),
        timeout_secs:      30,
        max_result_rows:   100_000,
    }),
    SourceCapabilities::sparql_endpoint(),
)?;

// Register sources
let mut registry = FederationRegistry::new();
registry.register(Arc::new(local));
registry.register(Arc::new(dbpedia));
registry.register(Arc::new(internal_endpoint));

// Pass registry to query engine
let engine = QueryEngine::with_federation(store, registry);
```

---

## R2RML Virtual Graphs (SQL → RDF)

R2RML (RDB to RDF Mapping Language) is a W3C standard for exposing relational database tables as virtual RDF graphs, queryable via SPARQL without physically materializing the triples.

IndentiaDB evaluates R2RML-mapped triples at query time: when a SPARQL query touches a predicate or class that is defined in an R2RML mapping, IndentiaDB rewrites the triple pattern into an SQL query and executes it against the configured relational database.

### Full R2RML Mapping Example

This maps an `employees` table to `foaf:Person` and `ex:Employee` triples:

```turtle
@prefix rr:   <http://www.w3.org/ns/r2rml#> .
@prefix ex:   <http://example.org/> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .
@prefix org:  <http://www.w3.org/ns/org#> .

# Map the employees table
ex:EmployeeMapping a rr:TriplesMap ;

    rr:logicalTable [
        rr:tableName "employees"
    ] ;

    rr:subjectMap [
        rr:template  "http://company.com/employee/{id}" ;
        rr:class     ex:Employee ;
        rr:class     foaf:Person ;
    ] ;

    # Full name
    rr:predicateObjectMap [
        rr:predicate foaf:name ;
        rr:objectMap [ rr:column "full_name" ; rr:language "en" ] ;
    ] ;

    # Email
    rr:predicateObjectMap [
        rr:predicate foaf:mbox ;
        rr:objectMap [
            rr:template  "mailto:{email}" ;
            rr:termType  rr:IRI ;
        ] ;
    ] ;

    # Department (foreign key → IRI)
    rr:predicateObjectMap [
        rr:predicate org:memberOf ;
        rr:objectMap [
            rr:template  "http://company.com/department/{department_id}" ;
            rr:termType  rr:IRI ;
        ] ;
    ] ;

    # Salary (typed literal)
    rr:predicateObjectMap [
        rr:predicate ex:salary ;
        rr:objectMap [
            rr:column   "salary" ;
            rr:datatype xsd:decimal ;
        ] ;
    ] ;

    # Hire date
    rr:predicateObjectMap [
        rr:predicate ex:hireDate ;
        rr:objectMap [
            rr:column   "hire_date" ;
            rr:datatype xsd:date ;
        ] ;
    ] ;

    # Active flag
    rr:predicateObjectMap [
        rr:predicate ex:isActive ;
        rr:objectMap [
            rr:column   "is_active" ;
            rr:datatype xsd:boolean ;
        ] ;
    ] .

# Map the departments table
ex:DepartmentMapping a rr:TriplesMap ;

    rr:logicalTable [
        rr:tableName "departments"
    ] ;

    rr:subjectMap [
        rr:template "http://company.com/department/{id}" ;
        rr:class    org:OrganizationalUnit ;
    ] ;

    rr:predicateObjectMap [
        rr:predicate foaf:name ;
        rr:objectMap [ rr:column "name" ] ;
    ] ;

    rr:predicateObjectMap [
        rr:predicate ex:budget ;
        rr:objectMap [ rr:column "budget" ; rr:datatype xsd:decimal ] ;
    ] .
```

### Registering an R2RML Source

```toml
[[federation.sources]]
name     = "hr_database"
type     = "r2rml"
mapping  = "config/hr-mapping.ttl"
database = "postgresql://hr-db.internal:5432/hrdb"
username = "${HR_DB_USERNAME}"
password = "${HR_DB_PASSWORD}"
pool_size = 5
```

### Querying the Virtual Graph

Once registered, the R2RML source is queryable via SPARQL exactly like any native graph:

```sparql
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX ex:   <http://example.org/>
PREFIX org:  <http://www.w3.org/ns/org#>

SELECT ?name ?department ?salary WHERE {
    ?employee a ex:Employee ;
              foaf:name   ?name ;
              org:memberOf ?dept ;
              ex:salary    ?salary .
    ?dept foaf:name ?department .
    FILTER(?salary > 80000)
}
ORDER BY DESC(?salary)
LIMIT 50
```

IndentiaDB translates this SPARQL query into:

```sql
SELECT e.full_name AS name, d.name AS department, e.salary
FROM employees e
JOIN departments d ON e.department_id = d.id
WHERE e.salary > 80000
ORDER BY e.salary DESC
LIMIT 50;
```

This translation happens transparently — the SPARQL client never sees the SQL.

### Supported Databases for R2RML

| Database | Driver | Connection String Format |
|----------|--------|--------------------------|
| PostgreSQL | libpq | `postgresql://user:pass@host:5432/db` |
| MySQL / MariaDB | mysqlclient | `mysql://user:pass@host:3306/db` |
| SQLite | rusqlite | `sqlite:///path/to/file.db` |
| SQL Server | tiberius | `mssql://user:pass@host:1433/db` |

### Supported R2RML Features

| Feature | Status | Notes |
|---------|--------|-------|
| `rr:tableName` | Supported | Direct table reference |
| `rr:sqlQuery` | Supported | Custom SQL as logical table |
| `rr:template` | Supported | IRI and literal templates with `{column}` placeholders |
| `rr:column` | Supported | Direct column reference |
| `rr:constant` | Supported | Constant IRI or literal value |
| `rr:class` | Supported | `rdf:type` triple shorthand |
| `rr:datatype` | Supported | Typed literals (xsd:integer, xsd:date, etc.) |
| `rr:language` | Supported | Language-tagged strings |
| `rr:joinCondition` | Supported | Foreign-key joins via `rr:parentTriplesMap` |
| R2RML Views | Planned | Named views as logical tables |

!!! warning "R2RML is Read-Only"
    The R2RML virtual graph supports SPARQL SELECT and CONSTRUCT queries only. SPARQL UPDATE (`INSERT DATA`, `DELETE DATA`) against an R2RML-mapped source is not supported — write to the relational database directly via its native driver.

---

## Query Optimization for Federation

IndentiaDB applies the following optimizations to federated queries:

1. **Sub-query minimization** — Only the triple patterns that reference bound variables from the SERVICE clause are sent to the remote endpoint. Filters that reference only remote variables are pushed down into the SERVICE sub-query.

2. **Parallel execution** — Independent `SERVICE` clauses in a single query are executed concurrently. The local query also runs in parallel with the remote sub-queries.

3. **Result caching** — Remote SERVICE results can be cached per-query with a configurable TTL:

    ```toml
    [federation]
    service_cache_ttl_secs = 300   # 5-minute cache for SERVICE results
    service_timeout_secs   = 30
    service_max_results    = 500_000
    ```

4. **Cardinality estimation** — The query planner uses cardinality estimates for local sources. For remote sources, a default estimate of 1,000 rows is used unless the remote endpoint advertises statistics via the SPARQL Service Description.
