# Use Cases: Enterprise Search, RAG & AI Agents

Real-world use cases that combine IndentiaDB's multi-model capabilities — RDF knowledge graphs, vector search, full-text search, and document storage — to build enterprise search platforms, RAG pipelines, and AI agent systems.

---

## Table of Contents

### Enterprise Search with Knowledge Graphs

1. [Knowledge-Enriched Document Search](#1-knowledge-enriched-document-search)
2. [Faceted Search from Ontology](#2-faceted-search-from-ontology)
3. [Entity-Linked Search Results](#3-entity-linked-search-results)
4. [Multi-Tenant Secure Knowledge Base](#4-multi-tenant-secure-knowledge-base)
5. [Regulatory Search with Compliance Graph](#5-regulatory-search-with-compliance-graph)

### RAG (Retrieval-Augmented Generation)

6. [RAG with RDF Knowledge Context](#6-rag-with-rdf-knowledge-context)
7. [Graph-Guided Chunk Retrieval](#7-graph-guided-chunk-retrieval)
8. [Multi-Hop Fact Retrieval for RAG](#8-multi-hop-fact-retrieval-for-rag)
9. [RAG with Provenance Tracking (RDF-star)](#9-rag-with-provenance-tracking)
10. [Hybrid RAG: Vector + BM25 + Knowledge Graph](#10-hybrid-rag-vector-bm25-knowledge-graph)

### AI Agent Patterns

11. [Agent Knowledge Base with RDF Ontology](#11-agent-knowledge-base-with-rdf-ontology)
12. [Agent Tool Selection via Capability Graph](#12-agent-tool-selection-via-capability-graph)
13. [Multi-Agent Collaboration with Shared Knowledge Graph](#13-multi-agent-collaboration-with-shared-knowledge-graph)
14. [Agent Memory: Episodic and Semantic](#14-agent-memory-episodic-and-semantic)
15. [Agent Reasoning with Graph Traversal](#15-agent-reasoning-with-graph-traversal)

---

## Enterprise Search with Knowledge Graphs

### 1. Knowledge-Enriched Document Search

Combine BM25 text search with RDF knowledge graph entities to boost results that mention known concepts.

```sql
-- Document store with full-text index
DEFINE ANALYZER english_analyzer TOKENIZERS blank, class
    FILTERS lowercase, snowball(english);

DEFINE TABLE kb_doc SCHEMAFULL;
DEFINE FIELD title       ON kb_doc TYPE string;
DEFINE FIELD content     ON kb_doc TYPE string;
DEFINE FIELD entities    ON kb_doc TYPE array<string>;
DEFINE FIELD embedding   ON kb_doc TYPE array<float>;
DEFINE INDEX idx_kb_content ON kb_doc FIELDS content
    FULLTEXT ANALYZER english_analyzer BM25(1.2, 0.75);

CREATE kb_doc:1 SET title = 'Kubernetes Security Hardening',
    content = 'Container orchestration security requires proper RBAC, network policies, and pod security standards.',
    entities = ['http://example.org/kubernetes', 'http://example.org/rbac',
                'http://example.org/container_security'],
    embedding = [0.82, 0.15, 0.91, 0.03];
CREATE kb_doc:2 SET title = 'RBAC Best Practices',
    content = 'Role-based access control should follow the principle of least privilege across all services.',
    entities = ['http://example.org/rbac', 'http://example.org/access_control'],
    embedding = [0.79, 0.12, 0.88, 0.05];
CREATE kb_doc:3 SET title = 'CI/CD Pipeline Security',
    content = 'Secure your continuous integration pipeline with code signing, dependency scanning, and SBOM generation.',
    entities = ['http://example.org/cicd', 'http://example.org/supply_chain_security'],
    embedding = [0.45, 0.80, 0.60, 0.10];
```

```sql
-- Query the knowledge graph for related concepts
LET $related = SPARQL("
    PREFIX ex:   <http://example.org/>
    PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
    SELECT ?related WHERE {
        ex:rbac skos:related ?related .
    }
");
-- Returns: access_control, kubernetes (via SKOS relationships in the ontology)

-- Boost search: text match + entity overlap with knowledge graph
LET $search_entities = array::concat(
    ['http://example.org/rbac'],
    $related.map(|$r| $r.related)
);

SELECT title,
    search::score(0) AS text_score,
    array::intersect(entities, $search_entities) AS matched_entities,
    array::len(array::intersect(entities, $search_entities)) AS entity_boost
FROM kb_doc
WHERE content @0@ 'access control security'
ORDER BY (search::score(0) + array::len(array::intersect(entities, $search_entities)) * 0.5) DESC;
-- RBAC Best Practices ranks highest (text match + entity overlap)
```

### 2. Faceted Search from Ontology

Use the RDF ontology to dynamically generate search facets (categories, types, hierarchies).

```sparql
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX ex:   <http://example.org/>

-- Build a taxonomy for faceted navigation
INSERT DATA {
    GRAPH <http://example.org/taxonomy> {
        ex:security a skos:Concept ;
            skos:prefLabel "Security" ;
            skos:narrower ex:network_security, ex:app_security, ex:data_security .
        ex:network_security a skos:Concept ;
            skos:prefLabel "Network Security" ;
            skos:broader ex:security .
        ex:app_security a skos:Concept ;
            skos:prefLabel "Application Security" ;
            skos:broader ex:security ;
            skos:narrower ex:owasp_top10, ex:secure_coding .
        ex:data_security a skos:Concept ;
            skos:prefLabel "Data Security" ;
            skos:broader ex:security .
        ex:owasp_top10 a skos:Concept ;
            skos:prefLabel "OWASP Top 10" ;
            skos:broader ex:app_security .
        ex:secure_coding a skos:Concept ;
            skos:prefLabel "Secure Coding" ;
            skos:broader ex:app_security .
    }
}
```

```sql
-- Facet expansion: when user selects "Application Security",
-- also include child concepts in the filter
LET $facet_iris = SPARQL("
    PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
    PREFIX ex:   <http://example.org/>
    SELECT ?concept ?label WHERE {
        GRAPH <http://example.org/taxonomy> {
            ex:app_security skos:narrower* ?concept .
            ?concept skos:prefLabel ?label .
        }
    }
");
-- Returns: Application Security, OWASP Top 10, Secure Coding

-- Apply expanded facet to document search
SELECT title, search::score(0) AS score
FROM kb_doc
WHERE content @0@ 'security'
  AND entities CONTAINSANY $facet_iris.map(|$f| 'http://example.org/' + string::replace(string::lowercase($f.label), ' ', '_'))
ORDER BY score DESC;
```

### 3. Entity-Linked Search Results

Annotate search results with structured entity cards from the knowledge graph.

```sql
DEFINE TABLE article SCHEMAFULL;
DEFINE FIELD title      ON article TYPE string;
DEFINE FIELD content    ON article TYPE string;
DEFINE FIELD entity_iri ON article TYPE string;

CREATE article:1 SET title = 'IndentiaDB Performance Benchmark',
    content = 'IndentiaDB achieves sub-millisecond SPARQL query latency on 100M triples.',
    entity_iri = 'http://example.org/indentiadb';
CREATE article:2 SET title = 'SurrealDB vs Traditional RDBMS',
    content = 'SurrealDB multi-model approach eliminates the need for separate databases.',
    entity_iri = 'http://example.org/surrealdb';
```

```sql
-- Search and enrich with entity card from knowledge graph
LET $results = SELECT title, content, entity_iri FROM article;

FOR $doc IN $results {
    LET $entity = SPARQL("
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        PREFIX ex:   <http://example.org/>
        SELECT ?label ?description ?website ?category WHERE {
            <" + $doc.entity_iri + "> rdfs:label ?label .
            OPTIONAL { <" + $doc.entity_iri + "> ex:description ?description }
            OPTIONAL { <" + $doc.entity_iri + "> ex:website ?website }
            OPTIONAL { <" + $doc.entity_iri + "> ex:category ?category }
        }
    ");

    RETURN {
        title: $doc.title,
        content: $doc.content,
        entity_card: $entity[0]
    };
};
-- Each result includes an entity_card with label, description, website, category
```

### 4. Multi-Tenant Secure Knowledge Base

Use RDF named graphs for tenant isolation combined with document-level access control.

```sparql
PREFIX ex: <http://example.org/>

-- Each tenant gets its own named graph
INSERT DATA {
    GRAPH <http://example.org/tenant/acme> {
        ex:acme_policy_001 a ex:Policy ;
            ex:title "Data Retention Policy" ;
            ex:classification "Internal" .
        ex:acme_policy_002 a ex:Policy ;
            ex:title "Incident Response Plan" ;
            ex:classification "Confidential" .
    }
    GRAPH <http://example.org/tenant/globex> {
        ex:globex_policy_001 a ex:Policy ;
            ex:title "Cloud Security Framework" ;
            ex:classification "Internal" .
    }
}
```

```sql
-- Document search scoped to tenant
DEFINE TABLE tenant_doc SCHEMAFULL;
DEFINE FIELD title     ON tenant_doc TYPE string;
DEFINE FIELD content   ON tenant_doc TYPE string;
DEFINE FIELD tenant_id ON tenant_doc TYPE string;
DEFINE FIELD embedding ON tenant_doc TYPE array<float>;

CREATE tenant_doc:1 SET title = 'Acme Security Handbook',
    content = 'All employees must complete annual security awareness training.',
    tenant_id = 'acme', embedding = [0.8, 0.2, 0.5, 0.1];
CREATE tenant_doc:2 SET title = 'Globex Operations Manual',
    content = 'Standard operating procedures for the engineering department.',
    tenant_id = 'globex', embedding = [0.3, 0.7, 0.4, 0.2];

-- Tenant-scoped vector search
SELECT title,
    vector::similarity::cosine(embedding, [0.75, 0.25, 0.45, 0.12]) AS score
FROM tenant_doc
WHERE tenant_id = 'acme'
ORDER BY score DESC;
-- Only returns Acme documents

-- Combine with tenant's RDF knowledge graph
LET $policies = SPARQL("
    PREFIX ex: <http://example.org/>
    SELECT ?title ?classification WHERE {
        GRAPH <http://example.org/tenant/acme> {
            ?p a ex:Policy ;
               ex:title ?title ;
               ex:classification ?classification .
        }
    }
");
-- Returns only Acme's policies — Globex data is invisible
```

### 5. Regulatory Search with Compliance Graph

Search regulatory documents enriched with structured compliance relationships from an RDF graph.

```sql
DEFINE ANALYZER legal_analyzer TOKENIZERS blank, class
    FILTERS lowercase, snowball(english);

DEFINE TABLE regulation SCHEMAFULL;
DEFINE FIELD title   ON regulation TYPE string;
DEFINE FIELD content ON regulation TYPE string;
DEFINE FIELD reg_iri ON regulation TYPE string;
DEFINE INDEX idx_reg_content ON regulation FIELDS content
    FULLTEXT ANALYZER legal_analyzer BM25(1.2, 0.75);

CREATE regulation:1 SET title = 'GDPR Article 17 - Right to Erasure',
    content = 'The data subject shall have the right to obtain from the controller the erasure of personal data without undue delay.',
    reg_iri = 'http://example.org/gdpr/art17';
CREATE regulation:2 SET title = 'GDPR Article 25 - Data Protection by Design',
    content = 'The controller shall implement appropriate technical and organisational measures for data protection.',
    reg_iri = 'http://example.org/gdpr/art25';
CREATE regulation:3 SET title = 'ISO 27001 A.8.2 - Information Classification',
    content = 'Information shall be classified in terms of legal requirements, value, criticality and sensitivity.',
    reg_iri = 'http://example.org/iso27001/a82';
```

```sql
-- Search for "data erasure" and enrich with compliance graph context
LET $search_results = SELECT title, reg_iri, search::score(0) AS score
    FROM regulation
    WHERE content @0@ 'data erasure'
    ORDER BY score DESC;

-- For each result, fetch related controls and implementation guidance from RDF
FOR $reg IN $search_results {
    LET $context = SPARQL("
        PREFIX comp: <http://example.org/compliance/>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        SELECT ?control ?status ?implementedBy WHERE {
            ?ctrl comp:implements <" + $reg.reg_iri + "> ;
                  rdfs:label ?control ;
                  comp:status ?status .
            OPTIONAL { ?ctrl comp:implementedBy ?implementedBy }
        }
    ");

    RETURN {
        title: $reg.title,
        score: $reg.score,
        controls: $context
    };
};
-- Returns search results annotated with compliance control status
```

---

## RAG (Retrieval-Augmented Generation)

### 6. RAG with RDF Knowledge Context

Enrich RAG-retrieved chunks with structured facts from the knowledge graph before sending to the LLM.

```sql
-- Chunk store with vector embeddings
DEFINE TABLE chunk SCHEMAFULL;
DEFINE FIELD doc_id    ON chunk TYPE string;
DEFINE FIELD text      ON chunk TYPE string;
DEFINE FIELD embedding ON chunk TYPE array<float>;
DEFINE FIELD entities  ON chunk TYPE array<string>;

CREATE chunk:1 SET doc_id = 'doc_arch',
    text = 'The authentication service uses OAuth2 with PKCE flow for all client applications.',
    embedding = [0.85, 0.10, 0.72, 0.03],
    entities = ['http://example.org/oauth2', 'http://example.org/auth_service'];
CREATE chunk:2 SET doc_id = 'doc_arch',
    text = 'Session tokens are stored in Redis with a 30-minute TTL and encrypted at rest.',
    embedding = [0.80, 0.15, 0.70, 0.05],
    entities = ['http://example.org/redis', 'http://example.org/session_management'];
CREATE chunk:3 SET doc_id = 'doc_ops',
    text = 'The API gateway routes requests to backend microservices based on path prefix matching.',
    embedding = [0.40, 0.85, 0.30, 0.10],
    entities = ['http://example.org/api_gateway', 'http://example.org/microservices'];
```

```sql
-- Step 1: Retrieve relevant chunks via vector search
LET $query_embedding = [0.83, 0.12, 0.71, 0.04];
LET $chunks = SELECT text, entities,
    vector::similarity::cosine(embedding, $query_embedding) AS score
FROM chunk
ORDER BY score DESC
LIMIT 3;

-- Step 2: Extract unique entities from retrieved chunks
LET $entity_iris = array::distinct(array::flatten($chunks.map(|$c| $c.entities)));

-- Step 3: Fetch structured facts from knowledge graph for those entities
LET $facts = SPARQL("
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX ex:   <http://example.org/>
    SELECT ?entity ?label ?description ?dependsOn ?version WHERE {
        VALUES ?entity { <http://example.org/oauth2> <http://example.org/auth_service>
                         <http://example.org/redis> <http://example.org/session_management> }
        ?entity rdfs:label ?label .
        OPTIONAL { ?entity ex:description ?description }
        OPTIONAL { ?entity ex:dependsOn ?dep . ?dep rdfs:label ?dependsOn }
        OPTIONAL { ?entity ex:version ?version }
    }
");

-- Step 4: Assemble RAG context for the LLM
RETURN {
    retrieved_chunks: $chunks.map(|$c| $c.text),
    knowledge_graph_facts: $facts,
    prompt_context: "Use the following document excerpts and knowledge graph facts to answer the question."
};
```

### 7. Graph-Guided Chunk Retrieval

Use the knowledge graph to expand retrieval beyond pure vector similarity — find related concepts and retrieve their chunks too.

```sql
-- User asks about "authentication security"
-- Step 1: Find related concepts in the ontology (1-hop expansion)
LET $expanded = SPARQL("
    PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
    PREFIX ex:   <http://example.org/>
    SELECT ?related ?label WHERE {
        ex:authentication (skos:related | skos:broader | skos:narrower) ?related .
        ?related rdfs:label ?label .
    }
");
-- Returns: oauth2, session_management, mfa, rbac

-- Step 2: Retrieve chunks that mention any of these expanded concepts
LET $expanded_iris = $expanded.map(|$r| $r.related);

SELECT text, entities,
    vector::similarity::cosine(embedding, [0.83, 0.12, 0.71, 0.04]) AS vector_score,
    array::len(array::intersect(entities, $expanded_iris)) AS graph_relevance
FROM chunk
ORDER BY (vector_score + graph_relevance * 0.3) DESC
LIMIT 5;
-- Retrieves chunks about OAuth2, sessions, AND authentication
-- even if their embeddings aren't the closest match
```

### 8. Multi-Hop Fact Retrieval for RAG

Traverse the knowledge graph across multiple hops to gather context that a flat vector search would miss.

```sparql
PREFIX ex:   <http://example.org/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

-- Question: "Who is responsible for the authentication service's dependencies?"

-- Hop 1: authentication service → dependencies
-- Hop 2: dependencies → teams that own them
-- Hop 3: teams → team leads

SELECT ?service ?dependency ?team ?teamLead ?email WHERE {
    GRAPH <http://example.org/cmdb> {
        ex:auth_service ex:dependsOn ?dep .
        ?dep rdfs:label ?dependency .
        ?dep ex:ownedBy ?team .
        ?team rdfs:label ?teamName .
        ?team ex:teamLead ?lead .
        ?lead rdfs:label ?teamLead .
        OPTIONAL { ?lead ex:email ?email }
    }
    BIND("Authentication Service" AS ?service)
}
```

```sql
-- Use multi-hop results as RAG context alongside vector search
LET $graph_context = SPARQL("
    PREFIX ex:   <http://example.org/>
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    SELECT ?dep ?team ?lead WHERE {
        GRAPH <http://example.org/cmdb> {
            ex:auth_service ex:dependsOn ?dep .
            ?dep ex:ownedBy ?t . ?t rdfs:label ?team .
            ?t ex:teamLead ?l . ?l rdfs:label ?lead .
        }
    }
");

LET $vector_chunks = SELECT text,
    vector::similarity::cosine(embedding, $query_vec) AS score
FROM chunk
WHERE entities CONTAINS 'http://example.org/auth_service'
ORDER BY score DESC LIMIT 5;

RETURN {
    graph_facts: $graph_context,
    document_chunks: $vector_chunks.map(|$c| $c.text),
    context_type: "multi-hop graph + vector retrieval"
};
```

### 9. RAG with Provenance Tracking

Use RDF-star to track which facts the LLM used in its response, enabling citation and trust scoring.

```sparql
PREFIX ex:  <http://example.org/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

-- Store facts with provenance annotations using RDF-star
INSERT DATA {
    ex:indentiadb ex:supports ex:sparql_1_2 .
    << ex:indentiadb ex:supports ex:sparql_1_2 >>
        ex:source "Official Documentation v2.1" ;
        ex:sourceURL "https://docs.indentia.ai/sparql" ;
        ex:confidence "0.99"^^xsd:float ;
        ex:lastVerified "2026-03-15"^^xsd:date .

    ex:indentiadb ex:maxTriples "10000000000"^^xsd:long .
    << ex:indentiadb ex:maxTriples "10000000000"^^xsd:long >>
        ex:source "Performance Benchmark Report" ;
        ex:confidence "0.90"^^xsd:float ;
        ex:lastVerified "2026-02-01"^^xsd:date .
}
```

```sql
-- Retrieve facts WITH provenance for RAG context
LET $facts_with_sources = SPARQL("
    PREFIX ex:  <http://example.org/>
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    SELECT ?subject ?predicate ?object ?source ?confidence ?verified WHERE {
        ?subject ?predicate ?object .
        << ?subject ?predicate ?object >>
            ex:source ?source ;
            ex:confidence ?confidence ;
            ex:lastVerified ?verified .
        FILTER (?confidence >= 0.85)
        FILTER (?subject = ex:indentiadb)
    }
    ORDER BY DESC(?confidence)
");

-- Build a citeable RAG context
RETURN {
    facts: $facts_with_sources,
    instruction: "When using these facts in your answer, cite the source. Only use facts with confidence >= 0.85."
};
```

### 10. Hybrid RAG: Vector + BM25 + Knowledge Graph

The ultimate retrieval pipeline: combine three retrieval strategies and fuse the results.

```sql
-- Three-signal retrieval for question: "How does IndentiaDB handle SPARQL query optimization?"

-- Signal 1: Vector similarity (semantic match)
LET $vec_results = SELECT id, text, entities,
    vector::similarity::cosine(embedding, $query_embedding) AS score
FROM chunk
ORDER BY score DESC LIMIT 10;

-- Signal 2: BM25 full-text (keyword match)
LET $bm25_results = SELECT id, text,
    search::score(0) AS score
FROM chunk
WHERE text @0@ 'SPARQL query optimization'
ORDER BY score DESC LIMIT 10;

-- Signal 3: Knowledge graph facts (structured match)
LET $kg_facts = SPARQL("
    PREFIX ex:   <http://example.org/>
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    SELECT ?feature ?description WHERE {
        ex:indentiadb ex:hasFeature ?f .
        ?f rdfs:label ?feature ;
           ex:description ?description .
        FILTER (CONTAINS(LCASE(?feature), 'sparql') || CONTAINS(LCASE(?feature), 'optimization'))
    }
");

-- Reciprocal Rank Fusion: combine all three signals
-- Application layer computes RRF scores; here we assemble the raw signals
RETURN {
    vector_hits: $vec_results,
    bm25_hits: $bm25_results,
    kg_facts: $kg_facts,
    fusion_strategy: "reciprocal_rank_fusion",
    k: 60
};
```

---

## AI Agent Patterns

### 11. Agent Knowledge Base with RDF Ontology

Give an AI agent a structured knowledge base backed by an ontology, so it can reason about entities and relationships.

```sparql
PREFIX ex:   <http://example.org/agent/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX owl:  <http://www.w3.org/2002/07/owl#>

-- Ontology for the agent's domain
INSERT DATA {
    GRAPH <http://example.org/agent/ontology> {
        ex:Customer a owl:Class .
        ex:Product a owl:Class .
        ex:Order a owl:Class .
        ex:SupportTicket a owl:Class .

        ex:purchasedProduct a owl:ObjectProperty ;
            rdfs:domain ex:Customer ;
            rdfs:range ex:Product .
        ex:hasTicket a owl:ObjectProperty ;
            rdfs:domain ex:Customer ;
            rdfs:range ex:SupportTicket .
        ex:relatedToProduct a owl:ObjectProperty ;
            rdfs:domain ex:SupportTicket ;
            rdfs:range ex:Product .
    }
}
```

```sparql
PREFIX ex:   <http://example.org/agent/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX xsd:  <http://www.w3.org/2001/XMLSchema#>

-- Instance data the agent can query
INSERT DATA {
    GRAPH <http://example.org/agent/data> {
        ex:cust_001 a ex:Customer ;
            rdfs:label "Acme Corp" ;
            ex:purchasedProduct ex:prod_db, ex:prod_search ;
            ex:hasTicket ex:ticket_101, ex:ticket_102 .

        ex:prod_db a ex:Product ;
            rdfs:label "IndentiaDB Enterprise" ;
            ex:version "2.1" .
        ex:prod_search a ex:Product ;
            rdfs:label "IndentiaSearch" ;
            ex:version "1.4" .

        ex:ticket_101 a ex:SupportTicket ;
            rdfs:label "SPARQL query timeout on large dataset" ;
            ex:relatedToProduct ex:prod_db ;
            ex:status "Open" ;
            ex:priority "High" ;
            ex:createdOn "2026-03-20"^^xsd:date .
        ex:ticket_102 a ex:SupportTicket ;
            rdfs:label "Search index not updating" ;
            ex:relatedToProduct ex:prod_search ;
            ex:status "Resolved" ;
            ex:priority "Medium" ;
            ex:createdOn "2026-03-15"^^xsd:date .
    }
}
```

```sql
-- Agent query: "What open tickets does Acme Corp have and which products are affected?"
LET $result = SPARQL("
    PREFIX ex:   <http://example.org/agent/>
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    SELECT ?customer ?ticket ?product ?priority WHERE {
        GRAPH <http://example.org/agent/data> {
            ?c a ex:Customer ;
               rdfs:label ?customer ;
               ex:hasTicket ?t .
            ?t rdfs:label ?ticket ;
               ex:relatedToProduct ?p ;
               ex:status 'Open' ;
               ex:priority ?priority .
            ?p rdfs:label ?product .
        }
    }
");
-- Returns: Acme Corp, "SPARQL query timeout on large dataset", IndentiaDB Enterprise, High
RETURN $result;
```

### 12. Agent Tool Selection via Capability Graph

Model agent tools and their capabilities as an RDF graph for intelligent tool selection.

```sparql
PREFIX tool: <http://example.org/tools/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX xsd:  <http://www.w3.org/2001/XMLSchema#>

INSERT DATA {
    GRAPH <http://example.org/agent/tools> {
        tool:web_search a tool:Tool ;
            rdfs:label "Web Search" ;
            tool:capability tool:cap_search, tool:cap_realtime_info ;
            tool:inputType "string" ;
            tool:costPerCall "0.01"^^xsd:float ;
            tool:avgLatencyMs "800"^^xsd:integer .

        tool:database_query a tool:Tool ;
            rdfs:label "Database Query" ;
            tool:capability tool:cap_structured_data, tool:cap_aggregation ;
            tool:inputType "sql" ;
            tool:costPerCall "0.001"^^xsd:float ;
            tool:avgLatencyMs "50"^^xsd:integer .

        tool:knowledge_graph a tool:Tool ;
            rdfs:label "Knowledge Graph Query" ;
            tool:capability tool:cap_reasoning, tool:cap_entity_lookup, tool:cap_relationship ;
            tool:inputType "sparql" ;
            tool:costPerCall "0.002"^^xsd:float ;
            tool:avgLatencyMs "30"^^xsd:integer .

        tool:vector_search a tool:Tool ;
            rdfs:label "Vector Search" ;
            tool:capability tool:cap_semantic_search, tool:cap_similarity ;
            tool:inputType "embedding" ;
            tool:costPerCall "0.005"^^xsd:float ;
            tool:avgLatencyMs "20"^^xsd:integer .

        -- Capability taxonomy
        tool:cap_search rdfs:label "Search" .
        tool:cap_realtime_info rdfs:label "Real-time Information" .
        tool:cap_structured_data rdfs:label "Structured Data Access" .
        tool:cap_aggregation rdfs:label "Data Aggregation" .
        tool:cap_reasoning rdfs:label "Logical Reasoning" .
        tool:cap_entity_lookup rdfs:label "Entity Lookup" .
        tool:cap_relationship rdfs:label "Relationship Discovery" .
        tool:cap_semantic_search rdfs:label "Semantic Search" .
        tool:cap_similarity rdfs:label "Similarity Matching" .
    }
}
```

```sql
-- Agent needs: "find relationships between entities" -> select the best tool
LET $tools = SPARQL("
    PREFIX tool: <http://example.org/tools/>
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    SELECT ?tool ?label ?cost ?latency WHERE {
        GRAPH <http://example.org/agent/tools> {
            ?tool a tool:Tool ;
                  rdfs:label ?label ;
                  tool:capability tool:cap_relationship ;
                  tool:costPerCall ?cost ;
                  tool:avgLatencyMs ?latency .
        }
    }
    ORDER BY ?cost
");
-- Returns: Knowledge Graph Query (cheapest, fastest for relationship queries)
RETURN $tools;
```

### 13. Multi-Agent Collaboration with Shared Knowledge Graph

Multiple agents contribute findings to a shared knowledge graph and read each other's discoveries.

```sql
-- Agent task log (document store)
DEFINE TABLE agent_finding SCHEMALESS;

CREATE agent_finding:1 SET
    agent_id = 'research_agent',
    timestamp = d'2026-03-23T10:00:00Z',
    finding = 'Customer Acme Corp reported 3 incidents this month',
    entity_iri = 'http://example.org/agent/cust_001',
    confidence = 0.95;

CREATE agent_finding:2 SET
    agent_id = 'analysis_agent',
    timestamp = d'2026-03-23T10:01:00Z',
    finding = 'Acme incidents correlate with v2.1 database upgrade',
    entity_iri = 'http://example.org/agent/prod_db',
    confidence = 0.82;
```

```sparql
PREFIX ex:   <http://example.org/agent/>
PREFIX xsd:  <http://www.w3.org/2001/XMLSchema#>

-- Agents publish structured findings to the shared knowledge graph
INSERT DATA {
    GRAPH <http://example.org/agent/shared> {
        ex:finding_001 a ex:AgentFinding ;
            ex:discoveredBy ex:research_agent ;
            ex:about ex:cust_001 ;
            ex:finding "3 incidents in March 2026" ;
            ex:confidence "0.95"^^xsd:float ;
            ex:timestamp "2026-03-23T10:00:00"^^xsd:dateTime .

        ex:finding_002 a ex:AgentFinding ;
            ex:discoveredBy ex:analysis_agent ;
            ex:about ex:prod_db ;
            ex:finding "Incidents correlate with v2.1 upgrade" ;
            ex:relatedFinding ex:finding_001 ;
            ex:confidence "0.82"^^xsd:float ;
            ex:timestamp "2026-03-23T10:01:00"^^xsd:dateTime .
    }
}
```

```sql
-- Synthesis agent: gather all findings about a customer and their products
LET $all_findings = SPARQL("
    PREFIX ex:   <http://example.org/agent/>
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    SELECT ?agent ?finding ?confidence ?related WHERE {
        GRAPH <http://example.org/agent/shared> {
            ?f a ex:AgentFinding ;
               ex:discoveredBy ?agent ;
               ex:finding ?finding ;
               ex:confidence ?confidence .
            {
                ?f ex:about ex:cust_001 .
            } UNION {
                ?f ex:about ?prod .
                ex:cust_001 ex:purchasedProduct ?prod .
            }
            OPTIONAL { ?f ex:relatedFinding ?rel . ?rel ex:finding ?related }
        }
    }
    ORDER BY DESC(?confidence)
");

-- The synthesis agent now has cross-agent context to formulate a response
RETURN $all_findings;
```

### 14. Agent Memory: Episodic and Semantic

Store agent memory as both episodic events (document store) and semantic knowledge (RDF graph).

```sql
-- Episodic memory: conversation events (document store, append-only)
DEFINE TABLE episode SCHEMALESS;

CREATE episode SET
    agent_id = 'assistant_01',
    session_id = 'session_abc',
    timestamp = d'2026-03-23T14:00:00Z',
    role = 'user',
    content = 'What products does Acme Corp use?',
    intent = 'product_inquiry';

CREATE episode SET
    agent_id = 'assistant_01',
    session_id = 'session_abc',
    timestamp = d'2026-03-23T14:00:02Z',
    role = 'assistant',
    content = 'Acme Corp uses IndentiaDB Enterprise v2.1 and IndentiaSearch v1.4.',
    tools_used = ['knowledge_graph'],
    entities_mentioned = ['http://example.org/agent/cust_001',
                          'http://example.org/agent/prod_db',
                          'http://example.org/agent/prod_search'];
```

```sparql
PREFIX ex:   <http://example.org/agent/>
PREFIX xsd:  <http://www.w3.org/2001/XMLSchema#>

-- Semantic memory: extract and store learned facts in the knowledge graph
INSERT DATA {
    GRAPH <http://example.org/agent/memory> {
        ex:cust_001 ex:lastInteraction "2026-03-23T14:00:00"^^xsd:dateTime ;
                    ex:interactionCount "15"^^xsd:integer ;
                    ex:sentiment "neutral" ;
                    ex:primaryConcern "product_performance" .
    }
}
```

```sql
-- When a new conversation starts, load both memory types
-- Episodic: recent conversations with this customer
LET $recent_episodes = SELECT content, timestamp, role
    FROM episode
    WHERE entities_mentioned CONTAINS 'http://example.org/agent/cust_001'
    ORDER BY timestamp DESC LIMIT 10;

-- Semantic: learned facts about this customer
LET $semantic_memory = SPARQL("
    PREFIX ex:   <http://example.org/agent/>
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    SELECT ?label ?lastInteraction ?sentiment ?concern WHERE {
        GRAPH <http://example.org/agent/memory> {
            ex:cust_001 ex:lastInteraction ?lastInteraction ;
                        ex:sentiment ?sentiment ;
                        ex:primaryConcern ?concern .
        }
        GRAPH <http://example.org/agent/data> {
            ex:cust_001 rdfs:label ?label .
        }
    }
");

RETURN {
    episodic: $recent_episodes,
    semantic: $semantic_memory,
    context: "Use episodic memory for conversation continuity, semantic memory for customer understanding."
};
```

### 15. Agent Reasoning with Graph Traversal

An agent uses graph traversal to build a chain of evidence before answering a question.

```sql
-- Question: "Why is the API service degraded?"
-- Agent strategy: traverse dependency graph to find root cause

-- Step 1: Get the service and its dependencies
LET $deps = SPARQL("
    PREFIX cmdb: <http://example.org/cmdb/>
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    SELECT ?service ?dependency ?depLabel WHERE {
        GRAPH <http://example.org/cmdb> {
            cmdb:svc_api cmdb:dependsOn+ ?dependency .
            ?dependency rdfs:label ?depLabel .
        }
    }
");
-- Returns: svc_database, svc_cache, and their transitive dependencies

-- Step 2: Check health status for each dependency
LET $health = SELECT service_iri, status, latency_ms, error_rate
    FROM service_health
    WHERE service_iri IN $deps.map(|$d| $d.dependency)
      AND timestamp >= d'2026-03-23T13:00:00Z'
    ORDER BY error_rate DESC;

-- Step 3: Find recent incidents linked to unhealthy services
LET $incidents = SPARQL("
    PREFIX cmdb: <http://example.org/cmdb/>
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    SELECT ?incident ?severity ?rootCause WHERE {
        GRAPH <http://example.org/cmdb> {
            ?inc a cmdb:Incident ;
                 rdfs:label ?incident ;
                 cmdb:affectsService cmdb:svc_api ;
                 cmdb:severity ?severity ;
                 cmdb:rootCause ?rc .
            ?rc rdfs:label ?rootCause .
            FILTER NOT EXISTS { ?inc cmdb:status 'Resolved' }
        }
    }
");

-- Step 4: Assemble reasoning chain
RETURN {
    question: "Why is the API service degraded?",
    dependency_chain: $deps,
    health_status: $health,
    active_incidents: $incidents,
    reasoning: "Traversed dependency graph -> checked health metrics -> found active incidents -> identified root cause"
};
```
