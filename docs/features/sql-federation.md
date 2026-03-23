# SQL Database Federation

IndentiaDB can query external SQL databases transparently through SPARQL, exposing relational tables as virtual RDF graphs via the W3C R2RML mapping standard. A SPARQL query that touches predicates defined in an R2RML mapping is automatically rewritten into SQL and executed against the configured relational database -- the SPARQL client never sees the SQL. This page covers database-specific configuration, query pushdown optimization, connection pooling, authentication, TLS, and operational guidance for each supported database.

For general R2RML mapping syntax and the federation `SERVICE` clause, see [Federated Queries](federation.md).

---

## Supported Databases

| Database | Driver | Min Version | Connection String | TLS |
|----------|--------|-------------|-------------------|-----|
| PostgreSQL | libpq (native) | 12+ | `postgresql://user:pass@host:5432/db` | Yes |
| MySQL / MariaDB | mysqlclient | MySQL 8.0+ / MariaDB 10.6+ | `mysql://user:pass@host:3306/db` | Yes |
| SQLite | rusqlite | 3.35+ | `sqlite:///path/to/file.db` | N/A |
| SQL Server | tiberius | 2017+ | `mssql://user:pass@host:1433/db` | Yes |

---

## Architecture

```
                           +------------------+
                           |  SPARQL Client   |
                           +--------+---------+
                                    |
                                    v
                      +---------------------------+
                      |  IndentiaDB Query Engine   |
                      |  (SPARQL parser + planner) |
                      +---------------------------+
                          |         |         |
              +-----------+    +----+----+    +-----------+
              |                |         |                |
     +--------v------+  +-----v----+ +--v----------+ +---v---------+
     | Local Triple   |  | PostgreSQL| | MySQL       | | SQL Server  |
     | Store          |  | via R2RML | | via R2RML   | | via R2RML   |
     +---------------+  +----------+ +-------------+ +-------------+
```

When a SPARQL query references a predicate or class defined in an R2RML mapping, the query engine:

1. Identifies which triple patterns map to which R2RML source.
2. Rewrites those triple patterns into SQL, pushing down filters, joins, ordering, and limits.
3. Sends the generated SQL to the relational database via a connection pool.
4. Converts the SQL result rows back into RDF bindings.
5. Joins the SQL-derived bindings with local triple store results in memory.

---

## PostgreSQL

### Configuration

```toml
[[federation.sources]]
name     = "pg_erp"
type     = "r2rml"
mapping  = "config/erp-mapping.ttl"
database = "postgresql://indentiadb:${PG_PASSWORD}@pg-primary.internal:5432/erp?sslmode=require"
pool_size          = 10
pool_min_idle      = 2
connection_timeout = 5
query_timeout      = 30
```

| Parameter | Default | Description |
|-----------|---------|-------------|
| `pool_size` | `5` | Maximum connections in the pool |
| `pool_min_idle` | `0` | Minimum idle connections kept open |
| `connection_timeout` | `10` | Seconds to wait for a connection from the pool |
| `query_timeout` | `30` | Per-query timeout in seconds |

### R2RML Mapping Example

Map a PostgreSQL `products` table and a `categories` table with a foreign-key join:

```turtle
@prefix rr:     <http://www.w3.org/ns/r2rml#> .
@prefix ex:     <http://example.org/> .
@prefix schema: <http://schema.org/> .
@prefix xsd:    <http://www.w3.org/2001/XMLSchema#> .

# Products table
ex:ProductMapping a rr:TriplesMap ;

    rr:logicalTable [
        rr:tableName "products"
    ] ;

    rr:subjectMap [
        rr:template "http://example.org/product/{id}" ;
        rr:class    schema:Product ;
    ] ;

    rr:predicateObjectMap [
        rr:predicate schema:name ;
        rr:objectMap [ rr:column "name" ] ;
    ] ;

    rr:predicateObjectMap [
        rr:predicate schema:description ;
        rr:objectMap [ rr:column "description" ; rr:language "en" ] ;
    ] ;

    rr:predicateObjectMap [
        rr:predicate schema:price ;
        rr:objectMap [ rr:column "price" ; rr:datatype xsd:decimal ] ;
    ] ;

    rr:predicateObjectMap [
        rr:predicate ex:sku ;
        rr:objectMap [ rr:column "sku" ] ;
    ] ;

    rr:predicateObjectMap [
        rr:predicate schema:category ;
        rr:objectMap [
            rr:parentTriplesMap ex:CategoryMapping ;
            rr:joinCondition [
                rr:child  "category_id" ;
                rr:parent "id" ;
            ] ;
        ] ;
    ] ;

    rr:predicateObjectMap [
        rr:predicate ex:inStock ;
        rr:objectMap [ rr:column "in_stock" ; rr:datatype xsd:boolean ] ;
    ] ;

    rr:predicateObjectMap [
        rr:predicate schema:dateCreated ;
        rr:objectMap [ rr:column "created_at" ; rr:datatype xsd:dateTime ] ;
    ] .

# Categories table
ex:CategoryMapping a rr:TriplesMap ;

    rr:logicalTable [
        rr:tableName "categories"
    ] ;

    rr:subjectMap [
        rr:template "http://example.org/category/{id}" ;
        rr:class    schema:Category ;
    ] ;

    rr:predicateObjectMap [
        rr:predicate schema:name ;
        rr:objectMap [ rr:column "name" ] ;
    ] .
```

### Querying PostgreSQL via SPARQL

```sparql
PREFIX schema: <http://schema.org/>
PREFIX ex:     <http://example.org/>

SELECT ?name ?price ?category WHERE {
    ?product a schema:Product ;
             schema:name     ?name ;
             schema:price    ?price ;
             schema:category ?cat ;
             ex:inStock      true .
    ?cat schema:name ?category .
    FILTER(?price < 100.00)
}
ORDER BY ?price
LIMIT 25
```

IndentiaDB rewrites this into:

```sql
SELECT p.name, p.price, c.name AS category
FROM products p
JOIN categories c ON p.category_id = c.id
WHERE p.in_stock = true
  AND p.price < 100.00
ORDER BY p.price ASC
LIMIT 25;
```

### PostgreSQL with Custom SQL View

Use `rr:sqlQuery` for complex mappings that go beyond a single table:

```turtle
ex:OrderSummaryMapping a rr:TriplesMap ;

    rr:logicalTable [
        rr:sqlQuery """
            SELECT
                o.id AS order_id,
                c.email AS customer_email,
                o.total_amount,
                o.order_date,
                o.status
            FROM orders o
            JOIN customers c ON o.customer_id = c.id
            WHERE o.status != 'cancelled'
        """
    ] ;

    rr:subjectMap [
        rr:template "http://example.org/order/{order_id}" ;
        rr:class    ex:Order ;
    ] ;

    rr:predicateObjectMap [
        rr:predicate ex:customer ;
        rr:objectMap [
            rr:template "mailto:{customer_email}" ;
            rr:termType rr:IRI ;
        ] ;
    ] ;

    rr:predicateObjectMap [
        rr:predicate ex:totalAmount ;
        rr:objectMap [ rr:column "total_amount" ; rr:datatype xsd:decimal ] ;
    ] ;

    rr:predicateObjectMap [
        rr:predicate ex:orderDate ;
        rr:objectMap [ rr:column "order_date" ; rr:datatype xsd:date ] ;
    ] .
```

### PostgreSQL TLS Configuration

```toml
[[federation.sources]]
name     = "pg_production"
type     = "r2rml"
mapping  = "config/prod-mapping.ttl"
database = "postgresql://indentiadb:${PG_PASSWORD}@pg.internal:5432/production?sslmode=verify-full&sslrootcert=/etc/ssl/pg-ca.crt"
pool_size = 20
```

| `sslmode` | Description |
|-----------|-------------|
| `disable` | No TLS (not recommended for production) |
| `require` | TLS required, but no certificate verification |
| `verify-ca` | TLS required, verify server certificate against CA |
| `verify-full` | TLS required, verify certificate and hostname match |

!!! warning "Always Use TLS in Production"
    SQL federation queries may contain sensitive data in `WHERE` clauses and result sets. Use `sslmode=verify-full` in production to prevent eavesdropping and man-in-the-middle attacks.

---

## MySQL / MariaDB

### Configuration

```toml
[[federation.sources]]
name     = "mysql_inventory"
type     = "r2rml"
mapping  = "config/inventory-mapping.ttl"
database = "mysql://indentiadb:${MYSQL_PASSWORD}@mysql.internal:3306/inventory?ssl-mode=REQUIRED"
pool_size          = 8
connection_timeout = 5
query_timeout      = 30
```

### R2RML Mapping Example

```turtle
@prefix rr:   <http://www.w3.org/ns/r2rml#> .
@prefix ex:   <http://example.org/> .
@prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .

ex:WarehouseMapping a rr:TriplesMap ;

    rr:logicalTable [
        rr:tableName "warehouses"
    ] ;

    rr:subjectMap [
        rr:template "http://example.org/warehouse/{warehouse_id}" ;
        rr:class    ex:Warehouse ;
    ] ;

    rr:predicateObjectMap [
        rr:predicate ex:location ;
        rr:objectMap [ rr:column "city" ] ;
    ] ;

    rr:predicateObjectMap [
        rr:predicate ex:capacity ;
        rr:objectMap [ rr:column "max_capacity" ; rr:datatype xsd:integer ] ;
    ] ;

    rr:predicateObjectMap [
        rr:predicate ex:currentStock ;
        rr:objectMap [ rr:column "current_stock" ; rr:datatype xsd:integer ] ;
    ] .
```

### MySQL-Specific Notes

- **Character set**: IndentiaDB assumes `utf8mb4` encoding. Set `character_set_connection=utf8mb4` in the connection string if the database default differs.
- **JSON columns**: MySQL JSON columns are extracted as string literals. Use `rr:sqlQuery` with `JSON_EXTRACT()` to map individual JSON fields.
- **ENUM columns**: MySQL ENUM values are mapped as `xsd:string` literals.

---

## SQLite

SQLite is useful for embedding small reference datasets or for development and testing.

### Configuration

```toml
[[federation.sources]]
name     = "sqlite_reference"
type     = "r2rml"
mapping  = "config/reference-mapping.ttl"
database = "sqlite:///var/lib/indentiadb/reference/iso-countries.db"
pool_size = 1    # SQLite supports only one writer; keep pool small
```

### R2RML Mapping Example

```turtle
@prefix rr:   <http://www.w3.org/ns/r2rml#> .
@prefix ex:   <http://example.org/> .
@prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .

ex:CountryMapping a rr:TriplesMap ;

    rr:logicalTable [
        rr:tableName "countries"
    ] ;

    rr:subjectMap [
        rr:template "http://example.org/country/{iso_alpha2}" ;
        rr:class    ex:Country ;
    ] ;

    rr:predicateObjectMap [
        rr:predicate ex:name ;
        rr:objectMap [ rr:column "name" ; rr:language "en" ] ;
    ] ;

    rr:predicateObjectMap [
        rr:predicate ex:isoCode ;
        rr:objectMap [ rr:column "iso_alpha2" ] ;
    ] ;

    rr:predicateObjectMap [
        rr:predicate ex:population ;
        rr:objectMap [ rr:column "population" ; rr:datatype xsd:integer ] ;
    ] .
```

!!! note "SQLite is Single-Writer"
    SQLite uses file-level locking. Set `pool_size = 1` to avoid `SQLITE_BUSY` errors. For high-concurrency scenarios, use PostgreSQL or MySQL instead.

---

## SQL Server

### Configuration

```toml
[[federation.sources]]
name     = "mssql_legacy"
type     = "r2rml"
mapping  = "config/legacy-mapping.ttl"
database = "mssql://sa:${MSSQL_PASSWORD}@sqlserver.internal:1433/LegacyERP?encrypt=true&trustServerCertificate=false"
pool_size          = 10
connection_timeout = 10
query_timeout      = 60
```

### SQL Server TLS Options

| Parameter | Description |
|-----------|-------------|
| `encrypt=true` | Require TLS encryption |
| `trustServerCertificate=true` | Accept self-signed certificates (dev only) |
| `trustServerCertificate=false` | Verify server certificate (production) |

### SQL Server-Specific Notes

- **Schema qualification**: Use `rr:sqlQuery` with fully qualified names (`dbo.TableName`) when the default schema is not `dbo`.
- **NVARCHAR columns**: Mapped as `xsd:string` with proper Unicode support.
- **Datetime2**: Mapped as `xsd:dateTime`. The older `datetime` type is also supported.

---

## Query Pushdown Optimization

IndentiaDB's query planner pushes as much work as possible into the SQL database to minimize data transfer and leverage the relational engine's indexes.

### What Gets Pushed Down

| SPARQL Feature | SQL Pushdown | Example |
|----------------|:------------:|---------|
| `FILTER(?x > 100)` | Yes | `WHERE x > 100` |
| `FILTER(?x = "value")` | Yes | `WHERE x = 'value'` |
| `FILTER(CONTAINS(?x, "foo"))` | Yes | `WHERE x LIKE '%foo%'` |
| `FILTER(STRSTARTS(?x, "pre"))` | Yes | `WHERE x LIKE 'pre%'` |
| `FILTER(REGEX(?x, "pattern"))` | Partial | `WHERE x REGEXP 'pattern'` (MySQL) or `~ 'pattern'` (PG) |
| `FILTER(BOUND(?x))` | Yes | `WHERE x IS NOT NULL` |
| `FILTER(!BOUND(?x))` | Yes | `WHERE x IS NULL` |
| `ORDER BY ?x` | Yes | `ORDER BY x` |
| `LIMIT N` | Yes | `LIMIT N` |
| `OFFSET N` | Yes | `OFFSET N` |
| `DISTINCT` | Yes | `SELECT DISTINCT` |
| Foreign-key joins (`rr:joinCondition`) | Yes | `JOIN ... ON` |
| `OPTIONAL` (left join) | Yes | `LEFT JOIN` |
| Aggregate functions | Partial | Pushed down when all grouped variables map to the same source |

### What Does Not Push Down

- Cross-source joins (e.g., joining a PostgreSQL column with a local RDF triple) are performed in memory by the IndentiaDB query engine.
- SPARQL property paths (`+`, `*`) over R2RML sources are evaluated by the engine, not pushed to SQL.
- `BIND`, `VALUES`, and subqueries that mix local and remote bindings are evaluated locally.

!!! tip "Maximize Pushdown"
    Structure your queries so that filters and joins involving only R2RML-mapped predicates appear together. The planner can push down an entire subgraph to a single SQL query when all triple patterns in that subgraph map to the same R2RML source.

---

## Joining SQL and RDF Data

The most powerful use case for SQL federation is joining relational data with RDF knowledge graph data in a single SPARQL query.

### Example: Enrich SQL Employee Data with RDF Skills Graph

Given an R2RML mapping for a PostgreSQL `employees` table and a local RDF skills ontology:

```sparql
PREFIX foaf:   <http://xmlns.com/foaf/0.1/>
PREFIX ex:     <http://example.org/>
PREFIX schema: <http://schema.org/>

SELECT ?name ?department ?skill ?proficiency WHERE {
    # From PostgreSQL (via R2RML)
    ?employee a ex:Employee ;
              foaf:name    ?name ;
              ex:department ?department .

    # From local RDF triple store
    ?employee ex:hasSkill ?skillRecord .
    ?skillRecord ex:skill       ?skill ;
                 ex:proficiency  ?proficiency .

    FILTER(?proficiency >= 4)
}
ORDER BY ?department ?name
```

IndentiaDB:

1. Pushes the `ex:Employee` pattern to PostgreSQL, retrieving `name` and `department`.
2. Uses the returned employee IRIs to look up `ex:hasSkill` triples in the local store.
3. Joins the two result sets in memory on the `?employee` variable.
4. Applies the `FILTER(?proficiency >= 4)` locally (since `ex:proficiency` is in the local store).

### Example: Combine Multiple SQL Databases

Query across PostgreSQL and MySQL in a single SPARQL query:

```sparql
PREFIX ex:   <http://example.org/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

SELECT ?employeeName ?projectName ?budget WHERE {
    # From PostgreSQL HR database
    ?employee a ex:Employee ;
              foaf:name ?employeeName ;
              ex:assignedTo ?project .

    # From MySQL project management database
    ?project a ex:Project ;
             ex:projectName ?projectName ;
             ex:budget ?budget .

    FILTER(?budget > 50000)
}
```

The query engine identifies that `ex:Employee` maps to the PostgreSQL source and `ex:Project` maps to the MySQL source, sends separate SQL queries to each, and joins the results on the `?project` variable.

---

## Connection Pooling

Each R2RML source maintains its own connection pool. Pool parameters are configured per source:

```toml
[[federation.sources]]
name     = "pg_main"
type     = "r2rml"
mapping  = "config/mapping.ttl"
database = "postgresql://user:pass@host:5432/db"

# Pool configuration
pool_size          = 20    # Max connections
pool_min_idle      = 5     # Keep at least 5 connections open
connection_timeout = 5     # Wait max 5s for a free connection
query_timeout      = 30    # Per-query timeout
idle_timeout       = 300   # Close idle connections after 5 minutes
max_lifetime       = 3600  # Recycle connections after 1 hour
```

| Parameter | Default | Description |
|-----------|---------|-------------|
| `pool_size` | `5` | Maximum number of connections in the pool |
| `pool_min_idle` | `0` | Minimum idle connections to keep open |
| `connection_timeout` | `10` | Seconds to wait for a connection from the pool before failing |
| `query_timeout` | `30` | Maximum query execution time in seconds |
| `idle_timeout` | `600` | Close connections idle longer than this (seconds) |
| `max_lifetime` | `1800` | Recycle connections older than this (seconds) |

!!! tip "Sizing the Connection Pool"
    Set `pool_size` to the expected peak concurrent SPARQL queries that touch this R2RML source. Each concurrent SPARQL query that references the source uses one connection for the duration of the SQL sub-query. Monitor `indentiadb_federation_pool_active` and `indentiadb_federation_pool_idle` Prometheus metrics to right-size the pool.

---

## Authentication

### Environment Variable Substitution

Connection strings support `${VAR}` environment variable substitution:

```toml
[[federation.sources]]
name     = "pg_secure"
type     = "r2rml"
mapping  = "config/mapping.ttl"
database = "postgresql://${PG_USER}:${PG_PASSWORD}@${PG_HOST}:5432/${PG_DATABASE}?sslmode=verify-full"
```

Set the variables at runtime:

```bash
export PG_USER=indentiadb
export PG_PASSWORD=secret
export PG_HOST=pg.internal
export PG_DATABASE=production

indentiagraph serve --config config.toml
```

### Kubernetes Secrets

In Kubernetes, mount secrets as environment variables:

```yaml
env:
  - name: PG_PASSWORD
    valueFrom:
      secretKeyRef:
        name: indentiadb-federation
        key: pg-password
  - name: MYSQL_PASSWORD
    valueFrom:
      secretKeyRef:
        name: indentiadb-federation
        key: mysql-password
```

!!! warning "Never Hardcode Passwords"
    Never put database passwords directly in `config.toml` or R2RML mapping files. Always use environment variable substitution (`${VAR}`) or a secrets manager.

---

## Monitoring and Troubleshooting

### Prometheus Metrics

IndentiaDB exposes federation-specific metrics on the `/metrics` endpoint:

| Metric | Type | Description |
|--------|------|-------------|
| `indentiadb_federation_queries_total` | Counter | Total SQL queries sent to each R2RML source |
| `indentiadb_federation_query_duration_seconds` | Histogram | SQL query execution time per source |
| `indentiadb_federation_errors_total` | Counter | SQL query errors per source |
| `indentiadb_federation_pool_active` | Gauge | Active connections per source |
| `indentiadb_federation_pool_idle` | Gauge | Idle connections per source |
| `indentiadb_federation_rows_returned` | Counter | Total rows returned from SQL sources |

### Debug Logging

Enable SQL query logging to see the generated SQL:

```toml
[logging]
level = "debug"
```

Or set the environment variable:

```bash
LOG_LEVEL=debug indentiagraph serve
```

With debug logging enabled, each SQL federation query produces a log entry:

```json
{
  "level": "DEBUG",
  "message": "R2RML SQL query",
  "source": "pg_erp",
  "sql": "SELECT p.name, p.price FROM products p WHERE p.price < $1 ORDER BY p.price LIMIT $2",
  "params": [100.00, 25],
  "duration_ms": 12,
  "rows": 25
}
```

### Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `connection refused` | Database unreachable | Check hostname, port, and firewall rules |
| `authentication failed` | Wrong credentials | Verify `${VAR}` environment variables are set |
| `SSL/TLS handshake failed` | Certificate mismatch | Check `sslrootcert` path and CA certificate validity |
| `pool timeout` | All connections busy | Increase `pool_size` or optimize slow queries |
| `query timeout` | SQL query too slow | Add database indexes, increase `query_timeout`, or add SPARQL `LIMIT` |
| `relation does not exist` | Table not found | Verify `rr:tableName` matches the actual table name (case-sensitive on PostgreSQL) |

---

## Limitations

- **Read-only**: R2RML virtual graphs support SPARQL `SELECT`, `CONSTRUCT`, `ASK`, and `DESCRIBE` only. `INSERT DATA` and `DELETE DATA` against R2RML sources are not supported.
- **No materialization**: Triples are generated on the fly at query time. There is no option to cache or materialize the virtual graph.
- **No full-text search pushdown**: SPARQL full-text search predicates (e.g., `bds:search`) are not pushed to the SQL database. Use SQL `LIKE` via `FILTER(CONTAINS(...))` instead.
- **No vector search pushdown**: SPARQL vector search extensions are evaluated locally, not pushed to pgvector or similar SQL extensions.
- **Single-statement queries**: Each R2RML source produces one SQL statement per SPARQL sub-query. Complex SPARQL patterns may result in multiple SQL round-trips.
