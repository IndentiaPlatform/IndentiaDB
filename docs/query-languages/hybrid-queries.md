# Hybrid Queries

IndentiaDB's most distinctive capability is the ability to combine multiple data models in a single query or transaction. This is enabled by the `SPARQL()` function in SurrealQL, `LET` variable bindings, and a unified query router that dispatches to the appropriate engine based on query type.

---

## The SPARQL() Function

The `SPARQL()` function can be called anywhere inside a SurrealQL statement. It dispatches the string argument to the SPARQL engine and returns the results as a SurrealQL array of objects. Each object has one key per `?variable` in the SELECT clause.

```sql
LET $results = SPARQL("SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 10");
-- $results is an array: [{ s: "...", p: "...", o: "..." }, ...]

RETURN $results;
```

The function is synchronous within the current transaction. If the SPARQL query fails, the error propagates and the containing SurrealQL statement fails.

---

## Query Routing Reference

| Pattern | Routed To | Notes |
|---------|-----------|-------|
| Starts with `SELECT`, `CREATE`, `UPDATE`, `DELETE`, `RELATE`, `DEFINE`, `BEGIN`, `COMMIT`, `CANCEL` | SurrealQL engine | Standard SurrealQL statements |
| Starts with `SELECT ?`, `ASK {`, `CONSTRUCT {`, `DESCRIBE`, `INSERT DATA`, `DELETE DATA`, `DELETE … INSERT … WHERE` | SPARQL engine | Standard SPARQL operations |
| `SPARQL("…")` inside a SurrealQL statement | Inline SPARQL dispatch | Returns SurrealQL array of row objects |
| `POST /lpg/query` with JSON body | LPG algorithm engine | Graph algorithms |
| `GET/POST /graphql` | GraphQL resolver | GraphQL queries |
| Any request to port 9200 | Elasticsearch-compatible engine | Full-text and hybrid search |

---

## When to Use SPARQL vs SurrealQL

| Task | Use |
|------|-----|
| Querying typed RDF triples and ontologies | SPARQL |
| Triple pattern matching with property paths | SPARQL |
| Federated queries across remote SPARQL endpoints | SPARQL |
| RDF-star provenance annotations | SPARQL |
| RDFS/OWL inference | SPARQL |
| Structured records with typed schemas | SurrealQL |
| Nested document CRUD | SurrealQL |
| Graph edge traversal (->/<-) | SurrealQL |
| Vector similarity search | SurrealQL |
| Full-text search | SurrealQL |
| Transactions spanning multiple writes | SurrealQL |
| LIVE queries (WebSocket push) | SurrealQL |
| Combining RDF facts with document/relational data | Hybrid: SPARQL() inside SurrealQL |
| Enriching documents with knowledge graph data | Hybrid: SPARQL() inside SurrealQL |
| Migrating RDF data into document tables | Hybrid: SPARQL() inside SurrealQL |

---

## Example 1: RDF Data Fetch into SurrealQL Variable

The simplest hybrid pattern: fetch RDF data and return it from SurrealQL.

```sql
LET $triples = SPARQL("SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 10");
RETURN $triples;
```

With prefix declarations:

```sql
LET $persons = SPARQL("
    PREFIX foaf: <http://xmlns.com/foaf/0.1/>
    SELECT ?uri ?name ?age WHERE {
        ?uri a foaf:Person ;
             foaf:name ?name .
        OPTIONAL { ?uri foaf:age ?age }
    }
    ORDER BY ?name
");

-- $persons is now a SurrealQL array:
-- [
--   { uri: "http://example.org/alice", name: "Alice", age: 30 },
--   { uri: "http://example.org/bob",   name: "Bob",   age: null }
-- ]

RETURN $persons;
```

---

## Example 2: RDF-to-SurrealDB Migration

Migrate existing RDF person data into the SurrealQL document model. This is useful when you want to give your RDF data a relational or document interface, or when moving from a pure triple store to IndentiaDB's hybrid model.

```sql
-- Step 1: Fetch all persons from RDF triple store
LET $rdf_persons = SPARQL("
    PREFIX foaf: <http://xmlns.com/foaf/0.1/>
    PREFIX xsd:  <http://www.w3.org/2001/XMLSchema#>

    SELECT ?uri ?name ?email ?age WHERE {
        ?uri a foaf:Person ;
             foaf:name ?name .
        OPTIONAL { ?uri foaf:mbox ?email }
        OPTIONAL { ?uri foaf:age  ?age }
    }
    ORDER BY ?name
");

-- Step 2: Create a document record for each RDF person
FOR $person IN $rdf_persons {
    CREATE person SET
        external_uri = $person.uri,
        name         = $person.name,
        email        = $person.email,
        age          = $person.age,
        source       = 'rdf_import',
        imported_at  = time::now();
};

-- Step 3: Verify
SELECT name, email, external_uri FROM person ORDER BY name;
```

The `FOR … IN` loop iterates over the SPARQL result set. Each `$person` object has the SPARQL variable names as keys. Missing `OPTIONAL` values are `NONE` in SurrealQL.

> **Performance note:** For large migrations (>100k records), batch the inserts using `LIMIT`/`OFFSET` in the SPARQL query and run multiple FOR loops. Each batch runs in its own transaction to avoid memory pressure.

---

## Example 3: Data Enrichment

Enrich a SurrealQL document with facts from the RDF knowledge graph. This pattern lets you keep structured records in SurrealQL while storing detailed semantic metadata in RDF, and join them at query time.

```sql
-- Assume: employee documents exist in SurrealQL with an 'external_uri' field
-- Assume: RDF contains skills, certifications, and publications

-- Step 1: Find the employee
LET $emp = SELECT * FROM employee WHERE email = 'alice@example.com' LIMIT 1;
LET $uri = $emp[0].external_uri;

-- Step 2: Fetch RDF enrichment data for this employee
LET $enrichment = SPARQL("
    PREFIX ex:   <http://example.org/>
    PREFIX foaf: <http://xmlns.com/foaf/0.1/>
    PREFIX org:  <http://www.w3.org/ns/org#>

    SELECT ?skill ?certification ?project_name WHERE {
        BIND(<" + $uri + "> AS ?person)

        OPTIONAL {
            ?person ex:hasSkill ?skill_node .
            ?skill_node ex:name ?skill .
        }
        OPTIONAL {
            ?person ex:hasCertification ?cert_node .
            ?cert_node ex:title ?certification .
        }
        OPTIONAL {
            ?person org:memberOf ?project .
            ?project ex:name ?project_name .
        }
    }
");

-- Step 3: Collect enrichment data
LET $skills = array::distinct(SELECT VALUE skill FROM $enrichment WHERE skill != NONE);
LET $certs  = array::distinct(SELECT VALUE certification FROM $enrichment WHERE certification != NONE);
LET $projects = array::distinct(SELECT VALUE project_name FROM $enrichment WHERE project_name != NONE);

-- Step 4: Store enrichment back into the document
UPDATE employee SET
    skills         = $skills,
    certifications = $certs,
    projects       = $projects,
    enriched_at    = time::now()
WHERE email = 'alice@example.com';

-- Step 5: Return enriched record
SELECT name, email, skills, certifications, projects FROM employee
WHERE email = 'alice@example.com';
```

---

## Example 4: Knowledge Graph Analytics with Mutual Connections

Find mutual connections (people known by both Alice and Bob) using SPARQL, then store and rank the mutual connection data using SurrealQL.

```sql
-- Step 1: Find mutual friends of Alice and Bob via SPARQL
LET $mutual = SPARQL("
    PREFIX foaf: <http://xmlns.com/foaf/0.1/>
    PREFIX ex:   <http://example.org/>
    PREFIX xsd:  <http://www.w3.org/2001/XMLSchema#>

    SELECT ?mutual ?name
           (COUNT(?shared_connection) AS ?depth_score) WHERE {
        -- Alice knows mutual
        ex:alice foaf:knows ?mutual .

        -- Bob also knows mutual
        ex:bob foaf:knows ?mutual .

        -- Get the name
        ?mutual foaf:name ?name .

        -- Count shared second-degree connections (for ranking)
        OPTIONAL {
            ?mutual foaf:knows ?shared_connection .
            ex:alice foaf:knows ?shared_connection .
            ex:bob   foaf:knows ?shared_connection .
        }
    }
    GROUP BY ?mutual ?name
    ORDER BY DESC(?depth_score)
");

-- $mutual is now: [{ mutual: "http://...", name: "Carol", depth_score: 3 }, ...]

-- Step 2: Store mutual connections in SurrealQL for fast future queries
FOR $person IN $mutual {
    UPSERT mutual_connection SET
        alice_iri   = 'http://example.org/alice',
        bob_iri     = 'http://example.org/bob',
        person_uri  = $person.mutual,
        person_name = $person.name,
        score       = $person.depth_score,
        computed_at = time::now();
};

-- Step 3: Query stored mutual connections (fast, no SPARQL overhead)
SELECT person_name, score
FROM mutual_connection
WHERE alice_iri = 'http://example.org/alice'
  AND bob_iri   = 'http://example.org/bob'
ORDER BY score DESC
LIMIT 10;

-- Step 4: Combine with employee data
SELECT m.person_name, m.score, e.department, e.salary
FROM mutual_connection AS m
LEFT JOIN employee AS e ON e.external_uri = m.person_uri
WHERE m.alice_iri = 'http://example.org/alice'
  AND m.bob_iri   = 'http://example.org/bob'
ORDER BY m.score DESC;
```

---

## Example 5: RAG Pipeline — RDF Facts to Vector Context

Build a Retrieval-Augmented Generation (RAG) context from the RDF knowledge graph. This pattern fetches structured facts from SPARQL, formats them as natural language context, and combines them with vector-retrieved document chunks.

```sql
-- Assume: the user's question has been embedded by the application
-- Assume: documents are indexed with HNSW vector index

LET $question_embedding = $query_vec;  -- passed from application
LET $entity_uri         = 'http://example.org/indentiadb';

-- Step 1: Fetch structured facts from RDF knowledge graph
LET $rdf_facts = SPARQL("
    PREFIX ex:   <http://example.org/>
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX xsd:  <http://www.w3.org/2001/XMLSchema#>
    PREFIX dbo:  <http://dbpedia.org/ontology/>

    SELECT ?property ?value ?unit WHERE {
        BIND(<" + $entity_uri + "> AS ?entity)

        {
            ?entity rdfs:label ?value .
            BIND('label' AS ?property)
            BIND('' AS ?unit)
        }
        UNION {
            ?entity ex:version ?value .
            BIND('version' AS ?property)
            BIND('' AS ?unit)
        }
        UNION {
            ?entity ex:license ?license_node .
            ?license_node rdfs:label ?value .
            BIND('license' AS ?property)
            BIND('' AS ?unit)
        }
        UNION {
            ?entity ex:writtenIn ?lang .
            ?lang rdfs:label ?value .
            BIND('programming_language' AS ?property)
            BIND('' AS ?unit)
        }
        UNION {
            ?entity ex:maxDatasetSize ?value ;
                    ex:maxDatasetUnit ?unit .
            BIND('max_dataset_size' AS ?property)
        }
    }
");

-- Step 2: Format RDF facts as natural language context
LET $fact_lines = (SELECT
    string::concat(property, ': ', string::from(value),
        IF unit != '' THEN string::concat(' ', unit) ELSE '' END)
    AS line
FROM $rdf_facts);

LET $structured_context = string::join(
    SELECT VALUE line FROM $fact_lines,
    '\n'
);

-- Step 3: Retrieve relevant document chunks via vector similarity
LET $doc_chunks = (
    SELECT title, content,
        vector::similarity::cosine(embedding, $question_embedding) AS relevance
    FROM document
    WHERE embedding <|5,200|> $question_embedding
    ORDER BY relevance DESC
);

-- Step 4: Format document context
LET $doc_context = string::join(
    SELECT VALUE string::concat('[', title, ']\n', content)
    FROM $doc_chunks,
    '\n\n'
);

-- Step 5: Assemble final RAG context for LLM
RETURN {
    structured_facts: $structured_context,
    document_chunks:  $doc_context,
    source_count:     array::len($rdf_facts) + array::len($doc_chunks),
    entity_uri:       $entity_uri
};
```

The returned object can be passed directly to your LLM API (OpenAI, Anthropic, etc.) as part of the system prompt or context window.

---

## Performance Considerations

### Inline SPARQL Call Cost

Each call to `SPARQL("…")` inside SurrealQL opens a SPARQL execution context, parses and optimizes the query, and runs it against the RDF triple index. For simple queries, this takes ~1–10 ms. For complex queries with large result sets or property paths, it may take longer.

**Recommendations:**

- Cache SPARQL results using `UPSERT` or `DEFINE TABLE` materialized views when the RDF data changes infrequently
- Use `LIMIT` in the SPARQL query to bound result set size
- Prefer `SELECT ?x ?y WHERE { … }` with explicit variables over `SELECT *` to minimize deserialization overhead
- Run SPARQL prefetches outside of hot loops; compute once with LET, then iterate

### Large Result Sets

If the SPARQL result has many rows, the `FOR $row IN $sparql_result { … }` pattern inside a single SurrealQL transaction can consume significant memory. For migrations or bulk operations, batch the work:

```sql
-- Process in batches of 1000
LET $offset = 0;
LET $batch_size = 1000;

LET $batch = SPARQL("
    PREFIX foaf: <http://xmlns.com/foaf/0.1/>
    SELECT ?uri ?name WHERE { ?uri a foaf:Person ; foaf:name ?name }
    ORDER BY ?uri
    LIMIT " + $batch_size + " OFFSET " + $offset + "
");
-- Run repeatedly, incrementing $offset, until $batch is empty
```

### SPARQL Variable Binding in Hybrid Queries

When embedding a SurrealQL variable into a SPARQL string (as in `BIND(<" + $uri + "> AS ?person)`), the variable is interpolated as a string before dispatch. Ensure the value is a valid IRI or literal for the SPARQL context. Values that contain characters that could break the SPARQL syntax should be sanitized or enclosed appropriately.

For passing sets of IRIs to SPARQL, use the `VALUES` clause:

```sql
LET $iris = SELECT VALUE external_uri FROM employee WHERE department = 'Engineering';

-- Convert to VALUES clause syntax
LET $values_clause = string::concat(
    'VALUES ?person { ',
    string::join(
        SELECT VALUE string::concat('<', uri, '>')
        FROM $iris,
        ' '
    ),
    ' }'
);

LET $result = SPARQL("
    PREFIX ex: <http://example.org/>
    SELECT ?person ?skill WHERE {
        " + $values_clause + "
        ?person ex:hasSkill ?skill .
    }
");
```

### Transactionality

`SPARQL()` inside a `BEGIN … COMMIT` transaction is atomic with the surrounding SurrealQL statements. If the transaction is cancelled (via `CANCEL` or an error), the SPARQL execution is also rolled back. However, writes made via `SPARQL()` (i.e., calling `SPARQL("INSERT DATA { … }")`) are not currently supported inside a SurrealQL `BEGIN` block — use `SPARQL()` for read-only SELECT queries inside transactions, and issue SPARQL UPDATE operations separately.
