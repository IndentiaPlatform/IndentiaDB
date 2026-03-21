# Elasticsearch-Compatible API

IndentiaDB exposes a REST API on port **9200** that is compatible with the Elasticsearch 8.x API surface. Existing Elasticsearch clients, SDKs, and tooling (Kibana, Logstash, Beats, OpenSearch Dashboards) can connect to this endpoint without modification.

Authentication is required. Use Basic auth (`-u root:changeme`) or an API key header on all requests.

---

## Cluster API

### GET `/` — Cluster Info

Returns basic cluster information.

```bash
curl -u root:changeme http://localhost:9200/
```

```json
{
  "name": "indentiadb-0",
  "cluster_name": "indentiadb",
  "cluster_uuid": "abc123",
  "version": {
    "number": "8.11.0",
    "build_flavor": "default"
  },
  "tagline": "You Know, for Search"
}
```

### GET `/_cluster/health`

Returns cluster health status.

```bash
curl -u root:changeme http://localhost:9200/_cluster/health
```

```json
{
  "cluster_name": "indentiadb",
  "status": "green",
  "number_of_nodes": 3,
  "number_of_data_nodes": 3,
  "active_primary_shards": 15,
  "active_shards": 30,
  "relocating_shards": 0,
  "initializing_shards": 0,
  "unassigned_shards": 0
}
```

### GET `/_cat/indices`

```bash
curl -u root:changeme "http://localhost:9200/_cat/indices?v"
```

### GET `/_cat/nodes`

```bash
curl -u root:changeme "http://localhost:9200/_cat/nodes?v"
```

---

## Index Management

### PUT `/{index}` — Create Index with Mapping

Create an index with explicit field mappings:

```bash
curl -u root:changeme \
  -X PUT http://localhost:9200/articles \
  -H "Content-Type: application/json" \
  -d '{
    "settings": {
      "number_of_shards": 1,
      "number_of_replicas": 1,
      "refresh_interval": "1s"
    },
    "mappings": {
      "properties": {
        "title": {
          "type": "text",
          "analyzer": "english"
        },
        "title_keyword": {
          "type": "keyword"
        },
        "content": {
          "type": "text",
          "analyzer": "english"
        },
        "author": {
          "type": "keyword"
        },
        "category": {
          "type": "keyword"
        },
        "published_at": {
          "type": "date",
          "format": "strict_date_optional_time"
        },
        "view_count": {
          "type": "integer"
        },
        "embedding": {
          "type": "dense_vector",
          "dims": 1536,
          "index": true,
          "similarity": "cosine"
        }
      }
    }
  }'
```

### Dense Vector Field Configuration

The `dense_vector` type supports three similarity functions:

| Similarity | Description |
|------------|-------------|
| `cosine` | Cosine similarity (recommended for normalized embeddings) |
| `l2_norm` | Euclidean distance (lower = more similar) |
| `dot_product` | Dot product (requires unit-length vectors) |

Full dense vector field example:

```json
"embedding": {
  "type": "dense_vector",
  "dims": 768,
  "index": true,
  "similarity": "cosine",
  "index_options": {
    "type": "hnsw",
    "m": 16,
    "ef_construction": 100
  }
}
```

### GET `/{index}` — Get Mapping

```bash
curl -u root:changeme http://localhost:9200/articles
```

### DELETE `/{index}` — Delete Index

```bash
curl -u root:changeme -X DELETE http://localhost:9200/articles
```

---

## Document Operations

### POST `/{index}/_doc` — Index with Auto ID

```bash
curl -u root:changeme \
  -X POST http://localhost:9200/articles/_doc \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Introduction to Graph Databases",
    "content": "Graph databases store data as nodes and edges.",
    "author": "alice",
    "category": "databases",
    "published_at": "2026-03-21T10:00:00Z",
    "view_count": 0
  }'
```

Response:

```json
{
  "_index": "articles",
  "_id": "abc123xyz",
  "_version": 1,
  "result": "created",
  "_shards": { "total": 2, "successful": 1, "failed": 0 }
}
```

### PUT `/{index}/_doc/{id}` — Index with Explicit ID

```bash
curl -u root:changeme \
  -X PUT http://localhost:9200/articles/_doc/article-001 \
  -H "Content-Type: application/json" \
  -d '{
    "title": "SPARQL Query Language",
    "content": "SPARQL is the standard query language for RDF data.",
    "author": "bob",
    "category": "rdf",
    "published_at": "2026-03-15T09:00:00Z"
  }'
```

### GET `/{index}/_doc/{id}` — Get Document

```bash
curl -u root:changeme http://localhost:9200/articles/_doc/article-001
```

Response:

```json
{
  "_index": "articles",
  "_id": "article-001",
  "_version": 1,
  "found": true,
  "_source": {
    "title": "SPARQL Query Language",
    "author": "bob"
  }
}
```

### DELETE `/{index}/_doc/{id}` — Delete Document

```bash
curl -u root:changeme \
  -X DELETE http://localhost:9200/articles/_doc/article-001
```

---

## Bulk Operations — POST `/_bulk`

The bulk API processes multiple operations in a single request. Each operation is two lines: an action line and (optionally) a document line.

```bash
curl -u root:changeme \
  -X POST http://localhost:9200/_bulk \
  -H "Content-Type: application/x-ndjson" \
  -d '
{"index": {"_index": "articles", "_id": "1"}}
{"title": "Graph Databases", "author": "alice", "category": "databases"}
{"index": {"_index": "articles", "_id": "2"}}
{"title": "Vector Search", "author": "bob", "category": "search"}
{"update": {"_index": "articles", "_id": "1"}}
{"doc": {"view_count": 100}}
{"delete": {"_index": "articles", "_id": "old-doc"}}
'
```

Supported operation types:

| Operation | Description |
|-----------|-------------|
| `index` | Index or replace a document |
| `create` | Index only if the document does not exist |
| `update` | Partial update of an existing document |
| `delete` | Delete a document (no document line required) |

---

## Search API — GET / POST `/{index}/_search`

The `_search` endpoint supports a rich query DSL. All examples use POST with a JSON body.

### 1. Match All

Return all documents:

```bash
curl -u root:changeme \
  -X POST http://localhost:9200/articles/_search \
  -H "Content-Type: application/json" \
  -d '{ "query": { "match_all": {} } }'
```

### 2. Match — Full-Text BM25

```json
{
  "query": {
    "match": {
      "content": {
        "query": "graph databases traversal",
        "operator": "or"
      }
    }
  }
}
```

With AND operator (all terms must appear):

```json
{
  "query": {
    "match": {
      "content": {
        "query": "graph database",
        "operator": "and"
      }
    }
  }
}
```

### 3. Match Phrase

All terms must appear in the specified order:

```json
{
  "query": {
    "match_phrase": {
      "content": "graph database traversal"
    }
  }
}
```

### 4. Multi-Match

Search across multiple fields simultaneously:

```json
{
  "query": {
    "multi_match": {
      "query": "sparql rdf knowledge graph",
      "fields": ["title^3", "content", "tags"],
      "type": "best_fields"
    }
  }
}
```

Multi-match types: `best_fields`, `most_fields`, `cross_fields`, `phrase`, `phrase_prefix`.

### 5. Term — Keyword Exact Match

```json
{
  "query": {
    "term": {
      "author": { "value": "alice" }
    }
  }
}
```

### 6. Terms — Match Any of Multiple Values

```json
{
  "query": {
    "terms": {
      "category": ["databases", "rdf", "search"]
    }
  }
}
```

### 7. Range

```json
{
  "query": {
    "range": {
      "published_at": {
        "gte": "2026-01-01",
        "lte": "2026-12-31"
      }
    }
  }
}
```

Numeric range:

```json
{
  "query": {
    "range": {
      "view_count": {
        "gte": 100,
        "lt": 10000
      }
    }
  }
}
```

### 8. Bool — Compound Queries

Combine `must`, `filter`, `should`, and `must_not` clauses:

```json
{
  "query": {
    "bool": {
      "must": [
        { "match": { "content": "sparql query" } }
      ],
      "filter": [
        { "term": { "category": "rdf" } },
        { "range": { "published_at": { "gte": "2025-01-01" } } }
      ],
      "should": [
        { "term": { "author": "alice" } },
        { "term": { "author": "bob" } }
      ],
      "must_not": [
        { "term": { "status": "draft" } }
      ],
      "minimum_should_match": 1
    }
  }
}
```

| Clause | Description |
|--------|-------------|
| `must` | Required — contributes to score |
| `filter` | Required — does not contribute to score (cached) |
| `should` | Optional — boosts score; `minimum_should_match` controls how many must match |
| `must_not` | Excluded from results |

### 9. Exists

Match documents where a field has a non-null value:

```json
{
  "query": {
    "exists": { "field": "embedding" }
  }
}
```

### 10. Prefix

```json
{
  "query": {
    "prefix": {
      "title": { "value": "graph" }
    }
  }
}
```

### 11. Wildcard

```json
{
  "query": {
    "wildcard": {
      "title": { "value": "graph*data?" }
    }
  }
}
```

### 12. Fuzzy

Match terms within a given edit distance:

```json
{
  "query": {
    "fuzzy": {
      "title": {
        "value": "grph databse",
        "fuzziness": "AUTO",
        "max_expansions": 50
      }
    }
  }
}
```

---

## KNN Search — Vector / Nearest Neighbor

Use the `knn` parameter to perform approximate nearest-neighbor search over `dense_vector` fields.

```bash
curl -u root:changeme \
  -X POST http://localhost:9200/articles/_search \
  -H "Content-Type: application/json" \
  -d '{
    "knn": {
      "field": "embedding",
      "query_vector": [0.12, 0.45, 0.78, 0.23, 0.56],
      "k": 10,
      "num_candidates": 100,
      "filter": {
        "term": { "status": "published" }
      }
    },
    "fields": ["title", "author", "published_at"],
    "_source": false
  }'
```

| Parameter | Description |
|-----------|-------------|
| `field` | The `dense_vector` field to search |
| `query_vector` | The query embedding vector (must match `dims`) |
| `k` | Number of nearest neighbors to return |
| `num_candidates` | Number of candidate vectors to examine per shard (higher = more accurate, slower) |
| `filter` | Optional pre-filter applied before KNN search |

---

## Hybrid Search — BM25 + KNN

Combine full-text BM25 and vector KNN scores in a single request. IndentiaDB merges the result lists using the scorer configured by `ES_HYBRID_SCORER` (`rrf`, `bayesian`, or `linear`).

```bash
curl -u root:changeme \
  -X POST http://localhost:9200/articles/_search \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "bool": {
        "must": [
          { "match": { "content": "graph database knowledge" } }
        ],
        "filter": [
          { "term": { "status": "published" } }
        ]
      }
    },
    "knn": {
      "field": "embedding",
      "query_vector": [0.12, 0.45, 0.78, 0.23],
      "k": 20,
      "num_candidates": 100
    },
    "size": 10,
    "from": 0
  }'
```

### Hybrid Scorer Configuration

Set the `ES_HYBRID_SCORER` environment variable on the server:

| Scorer | Description |
|--------|-------------|
| `rrf` | Reciprocal Rank Fusion — robust default, no tuning needed |
| `bayesian` | Bayesian score fusion — better calibration for imbalanced corpora |
| `linear` | Weighted linear combination — requires manual weight tuning |

---

## Aggregations

### Terms Aggregation

```json
{
  "query": { "match_all": {} },
  "aggs": {
    "categories": {
      "terms": {
        "field": "category",
        "size": 10
      }
    }
  },
  "size": 0
}
```

### Histogram Aggregation

```json
{
  "aggs": {
    "view_ranges": {
      "histogram": {
        "field": "view_count",
        "interval": 100
      }
    }
  },
  "size": 0
}
```

### Date Histogram Aggregation

```json
{
  "aggs": {
    "articles_over_time": {
      "date_histogram": {
        "field": "published_at",
        "calendar_interval": "month",
        "format": "yyyy-MM"
      }
    }
  },
  "size": 0
}
```

### Metric Aggregations

```json
{
  "aggs": {
    "avg_views": { "avg": { "field": "view_count" } },
    "total_views": { "sum": { "field": "view_count" } },
    "max_views": { "max": { "field": "view_count" } },
    "min_views": { "min": { "field": "view_count" } },
    "unique_authors": { "cardinality": { "field": "author" } }
  },
  "size": 0
}
```

### Nested Aggregations

```json
{
  "aggs": {
    "by_category": {
      "terms": { "field": "category" },
      "aggs": {
        "avg_views": { "avg": { "field": "view_count" } }
      }
    }
  },
  "size": 0
}
```

---

## SPARQL Extensions (`_ext`)

IndentiaDB extends the standard Elasticsearch-compatible search API with SPARQL-enriched query patterns via the `_ext` field.

### 1. SPARQL Enrich

Enrich search results with data from the RDF triple store:

```json
{
  "query": { "match": { "content": "alice" } },
  "_ext": {
    "sparql_enrich": {
      "query": "SELECT ?name ?org WHERE { <{id}> foaf:name ?name ; ex:worksAt ?org }",
      "bind": "id"
    }
  }
}
```

### 2. Knowledge Graph Boost

Boost documents whose entities appear prominently in the knowledge graph:

```json
{
  "query": { "match": { "content": "machine learning" } },
  "_ext": {
    "kg_boost": {
      "entity_field": "entities",
      "boost_factor": 1.5,
      "min_pagerank": 0.01
    }
  }
}
```

### 3. SPARQL Filter

Pre-filter candidates using a SPARQL ASK query:

```json
{
  "query": { "match_all": {} },
  "_ext": {
    "sparql_filter": {
      "ask": "ASK { <{id}> ex:status 'active' }",
      "bind": "id"
    }
  }
}
```

### 4. SPARQL Expand

Expand query terms using ontology synonyms from the triple store:

```json
{
  "query": { "match": { "content": "car" } },
  "_ext": {
    "sparql_expand": {
      "synonym_query": "SELECT ?syn WHERE { ex:car skos:altLabel ?syn }",
      "field": "content"
    }
  }
}
```

### 5. Format

Return results in a specific RDF serialization:

```json
{
  "query": { "match": { "content": "rdf" } },
  "_ext": {
    "format": "turtle"
  }
}
```

---

## Pagination

### From / Size

```json
{
  "query": { "match_all": {} },
  "from": 20,
  "size": 10,
  "sort": [{ "published_at": "desc" }]
}
```

### Search After (Deep Pagination)

Use `search_after` with a sort value from the last result to paginate efficiently without offset overhead:

```json
{
  "query": { "match_all": {} },
  "size": 10,
  "sort": [
    { "published_at": "desc" },
    { "_id": "asc" }
  ],
  "search_after": ["2026-03-01T00:00:00Z", "article-099"]
}
```

### Scroll API

For bulk data export, use the scroll API to iterate over large result sets:

```bash
# Initialize scroll
curl -u root:changeme \
  "http://localhost:9200/articles/_search?scroll=1m" \
  -H "Content-Type: application/json" \
  -d '{ "size": 100, "query": { "match_all": {} } }'

# Continue scrolling using the scroll_id from the previous response
curl -u root:changeme \
  -X POST "http://localhost:9200/_search/scroll" \
  -H "Content-Type: application/json" \
  -d '{
    "scroll": "1m",
    "scroll_id": "<scroll_id_from_previous_response>"
  }'
```

---

## Field Collapsing

Collapse duplicate results by a field value, returning only the top-ranked document per group:

```json
{
  "query": { "match": { "content": "graph" } },
  "collapse": {
    "field": "author",
    "inner_hits": {
      "name": "other_by_author",
      "size": 3,
      "sort": [{ "published_at": "desc" }]
    }
  }
}
```

---

## Highlighting

Return highlighted snippets showing where query terms matched:

```json
{
  "query": { "match": { "content": "graph database" } },
  "highlight": {
    "fields": {
      "content": {
        "fragment_size": 150,
        "number_of_fragments": 3,
        "pre_tags": ["<mark>"],
        "post_tags": ["</mark>"]
      }
    }
  }
}
```

---

## Source Filtering

Control which fields are included in the `_source` of each result:

```json
{
  "query": { "match_all": {} },
  "_source": {
    "includes": ["title", "author", "published_at"],
    "excludes": ["embedding", "content"]
  }
}
```

Disable source entirely (useful when using `fields`):

```json
{
  "query": { "match_all": {} },
  "_source": false,
  "fields": ["title", "author"]
}
```
