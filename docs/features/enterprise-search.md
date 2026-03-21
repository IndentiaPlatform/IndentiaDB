# Enterprise Search

IndentiaDB ships a full-featured enterprise search engine that is simultaneously a native BM25 index, an Elasticsearch-compatible REST API on port 9200, a hybrid vector+text ranker, and a SPARQL-aware search extension layer — all without a separate process.

---

## BM25 Full-Text Search

### How BM25 Scoring Works

BM25 (Best Match 25) is a probabilistic ranking function that improves on plain TF-IDF by applying saturation and length normalization. The score for term `t` in document `d` against query `q` is:

```
score(d, q) = Σ IDF(t) × [ f(t, d) × (k1 + 1) ]
                          ─────────────────────────────────
                          [ f(t, d) + k1 × (1 - b + b × |d|/avgdl) ]
```

Where:

| Symbol | Meaning | Default |
|--------|---------|---------|
| `f(t, d)` | Raw term frequency of `t` in `d` | — |
| `k1` | Term saturation parameter | `1.2` |
| `b` | Length normalization factor | `0.75` |
| `IDF(t)` | Inverse document frequency: `log((N - df + 0.5) / (df + 0.5) + 1)` | — |
| `\|d\|` | Number of tokens in `d` | — |
| `avgdl` | Average document length in corpus | — |

!!! tip "Tuning BM25 Parameters"
    Lower `b` (towards 0) reduces length normalization — useful for short documents where length variance is irrelevant. Increase `k1` (towards 2.0) to reward repeated terms more strongly.

Both `k1` and `b` are configurable per-index in the index settings:

```json
PUT http://localhost:9200/my-index
{
  "settings": {
    "similarity": {
      "default": {
        "type": "BM25",
        "k1": 1.2,
        "b": 0.75
      }
    }
  }
}
```

### Inverted Index Architecture

IndentiaDB's full-text engine maintains two complementary structures per index:

**Word postings list** — classic inverted index mapping each token to a sorted list of `(doc_id, term_frequency, position_list)` tuples. Positions enable phrase matching and proximity scoring.

**Entity co-occurrence index** — an additional inverted structure that maps RDF entity IRIs to the documents that mention them. This powers knowledge-graph boosting (see `kg_boost` below): a document that explicitly mentions `ex:alice` scores higher on queries that semantically relate to Alice's SPARQL neighborhood.

```
Token: "machine"
  → [(doc:42, tf:3, positions:[4, 17, 89]),
     (doc:107, tf:1, positions:[12]),
     (doc:204, tf:2, positions:[3, 55])]

Entity: "http://example.org/alice"
  → [doc:42, doc:88, doc:204]
```

### Multi-Stage Compression Pipeline

Documents pass through the following pipeline on write:

1. **Tokenization** — Unicode-aware token splitting with configurable analyzers (standard, whitespace, language-specific).
2. **Normalization** — lowercasing, Unicode NFC normalization, accent folding.
3. **Stop-word removal** — configurable per-language stop list.
4. **Stemming** — pluggable Snowball stemmer (English, Dutch, German, French, Spanish by default).
5. **Posting compression** — delta-encoding of doc IDs followed by ZSTD block compression. Each posting block is 128 entries; blocks are independently decompressible to allow skip-list random access.
6. **Position encoding** — position deltas stored as variable-length integers (VLInt) for minimal byte overhead.

The compressed postings are stored in the same SurrealKV / TiKV key-value backend as all other IndentiaDB data, ensuring unified backups and transactions.

---

## Elasticsearch-Compatible API (Port 9200)

IndentiaDB exposes a drop-in Elasticsearch REST API. Any existing ES client library works without modification.

!!! success "Drop-In Compatibility"
    Point your existing `elasticsearch-py`, `elasticsearch-js`, `curl`-based scripts, or Kibana (read queries) at `http://your-host:9200` and they work. No client-side code changes are required.

### Supported APIs

| Category | Endpoints | Notes |
|----------|-----------|-------|
| **Document** | `PUT /{index}/_doc/{id}`, `GET /{index}/_doc/{id}`, `DELETE /{index}/_doc/{id}`, `POST /{index}/_doc` | Full CRUD |
| **Search** | `GET/POST /{index}/_search`, `GET/POST /_search` | Full Query DSL |
| **Query DSL** | `match`, `multi_match`, `match_phrase`, `fuzzy`, `term`, `terms`, `range`, `bool`, `exists`, `ids`, `match_all` | See examples below |
| **Aggregations** | `terms` bucket, `date_histogram`, `range` bucket, `avg`, `sum`, `min`, `max`, `value_count` | — |
| **Index** | `PUT /{index}`, `DELETE /{index}`, `GET /{index}`, `HEAD /{index}`, `PUT /{index}/_mapping`, `GET /{index}/_mapping` | — |
| **Bulk** | `POST /_bulk`, `POST /{index}/_bulk` | `index`, `create`, `update`, `delete` actions |
| **Cluster** | `GET /_cluster/health`, `GET /_cat/indices`, `GET /_cat/health`, `GET /_nodes` | Read-only |
| **KNN** | `knn` field in `_search` body | See [Vector Search](vector-search.md) |

!!! note "Unsupported ES Features"
    IndentiaDB does not implement the Watcher, ILM, ML, CCR, or Snapshot/Restore Elasticsearch subsystems. These are Elasticsearch-proprietary features not part of the public query API.

---

## Search Examples

### 1. Basic Match Query

```bash
curl -X POST http://localhost:9200/articles/_search \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "match": {
        "content": "knowledge graph database"
      }
    },
    "size": 10
  }'
```

```python
from elasticsearch import Elasticsearch

es = Elasticsearch("http://localhost:9200")

response = es.search(
    index="articles",
    body={
        "query": {
            "match": {
                "content": "knowledge graph database"
            }
        },
        "size": 10
    }
)

for hit in response["hits"]["hits"]:
    print(hit["_score"], hit["_source"]["title"])
```

### 2. Multi-Field Search

```bash
curl -X POST http://localhost:9200/articles/_search \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "multi_match": {
        "query": "semantic search SPARQL",
        "fields": ["title^3", "content", "abstract^2"],
        "type": "best_fields",
        "tie_breaker": 0.3
      }
    }
  }'
```

```python
response = es.search(
    index="articles",
    body={
        "query": {
            "multi_match": {
                "query": "semantic search SPARQL",
                "fields": ["title^3", "content", "abstract^2"],
                "type": "best_fields",
                "tie_breaker": 0.3
            }
        }
    }
)
```

The `^3` notation boosts the `title` field's contribution to the final score by a factor of 3.

### 3. Bool Query with Must / Filter / Should

```bash
curl -X POST http://localhost:9200/papers/_search \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "bool": {
        "must": [
          { "match": { "abstract": "graph neural network" } }
        ],
        "filter": [
          { "term":  { "status": "published" } },
          { "range": { "year": { "gte": 2020 } } }
        ],
        "should": [
          { "match": { "title": "knowledge graph" } },
          { "match": { "title": "embedding" } }
        ],
        "minimum_should_match": 1
      }
    }
  }'
```

```python
response = es.search(
    index="papers",
    body={
        "query": {
            "bool": {
                "must": [
                    {"match": {"abstract": "graph neural network"}}
                ],
                "filter": [
                    {"term":  {"status": "published"}},
                    {"range": {"year": {"gte": 2020}}}
                ],
                "should": [
                    {"match": {"title": "knowledge graph"}},
                    {"match": {"title": "embedding"}}
                ],
                "minimum_should_match": 1
            }
        }
    }
)
```

!!! tip "Filter vs Must"
    Use `filter` for non-scoring conditions (date ranges, status flags, exact terms). Filtered clauses are cached and do not affect relevance scoring. Use `must` only for conditions that should influence ranking.

### 4. Phrase Match

```bash
curl -X POST http://localhost:9200/articles/_search \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "match_phrase": {
        "content": {
          "query": "machine learning inference",
          "slop": 2
        }
      }
    }
  }'
```

`slop: 2` allows up to 2 intervening tokens between the phrase words while still matching.

```python
response = es.search(
    index="articles",
    body={
        "query": {
            "match_phrase": {
                "content": {
                    "query": "machine learning inference",
                    "slop": 2
                }
            }
        }
    }
)
```

### 5. Fuzzy Search

```bash
curl -X POST http://localhost:9200/articles/_search \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "fuzzy": {
        "title": {
          "value": "knowledg",
          "fuzziness": "AUTO",
          "max_expansions": 50,
          "prefix_length": 2
        }
      }
    }
  }'
```

`fuzziness: "AUTO"` maps to edit distance 0 for terms ≤2 characters, 1 for terms 3–5, and 2 for longer terms.

```python
response = es.search(
    index="articles",
    body={
        "query": {
            "fuzzy": {
                "title": {
                    "value": "knowledg",
                    "fuzziness": "AUTO",
                    "max_expansions": 50,
                    "prefix_length": 2
                }
            }
        }
    }
)
```

### 6. Faceted Aggregation (Terms Bucket)

```bash
curl -X POST http://localhost:9200/papers/_search \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "match": { "abstract": "deep learning" }
    },
    "aggs": {
      "by_venue": {
        "terms": {
          "field": "venue.keyword",
          "size": 10
        }
      },
      "by_year": {
        "terms": {
          "field": "year",
          "size": 5
        }
      }
    },
    "size": 20
  }'
```

```python
response = es.search(
    index="papers",
    body={
        "query": {"match": {"abstract": "deep learning"}},
        "aggs": {
            "by_venue": {
                "terms": {"field": "venue.keyword", "size": 10}
            },
            "by_year": {
                "terms": {"field": "year", "size": 5}
            }
        },
        "size": 20
    }
)

for bucket in response["aggregations"]["by_venue"]["buckets"]:
    print(bucket["key"], bucket["doc_count"])
```

### 7. Range Filter

```bash
curl -X POST http://localhost:9200/papers/_search \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "bool": {
        "must": { "match": { "abstract": "transformer architecture" } },
        "filter": {
          "range": {
            "publication_date": {
              "gte": "2022-01-01",
              "lte": "2024-12-31",
              "format": "yyyy-MM-dd"
            }
          }
        }
      }
    }
  }'
```

```python
response = es.search(
    index="papers",
    body={
        "query": {
            "bool": {
                "must": {"match": {"abstract": "transformer architecture"}},
                "filter": {
                    "range": {
                        "publication_date": {
                            "gte": "2022-01-01",
                            "lte": "2024-12-31",
                            "format": "yyyy-MM-dd"
                        }
                    }
                }
            }
        }
    }
)
```

### 8. Highlighting

```bash
curl -X POST http://localhost:9200/articles/_search \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "match": { "content": "knowledge graph reasoning" }
    },
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
  }'
```

```python
response = es.search(
    index="articles",
    body={
        "query": {"match": {"content": "knowledge graph reasoning"}},
        "highlight": {
            "fields": {
                "content": {
                    "fragment_size": 150,
                    "number_of_fragments": 3,
                    "pre_tags":  ["<mark>"],
                    "post_tags": ["</mark>"]
                }
            }
        }
    }
)

for hit in response["hits"]["hits"]:
    if "highlight" in hit:
        for fragment in hit["highlight"].get("content", []):
            print(fragment)
```

### 9. Sort by Field

```bash
curl -X POST http://localhost:9200/papers/_search \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "match": { "abstract": "SPARQL query optimization" }
    },
    "sort": [
      { "citation_count": { "order": "desc" } },
      { "_score": { "order": "desc" } }
    ]
  }'
```

```python
response = es.search(
    index="papers",
    body={
        "query": {"match": {"abstract": "SPARQL query optimization"}},
        "sort": [
            {"citation_count": {"order": "desc"}},
            {"_score":         {"order": "desc"}}
        ]
    }
)
```

---

## Hybrid Search (BM25 + Vector)

Hybrid search combines a BM25 lexical score with a dense vector similarity score to produce a single ranked result list that is better than either component alone.

**Why hybrid search outperforms either model alone:**

- BM25 excels at exact-term matching (product codes, names, technical terms) but fails on synonyms, paraphrases, and semantic equivalence.
- Dense vector search excels at semantic similarity but struggles with rare terms not seen in training data.
- Hybrid fusion leverages the complementary strengths of both signals.

### Bayesian Fusion Algorithm (NDCG@10: 0.9149)

IndentiaDB's default hybrid scorer uses Bayesian probability calibration to fuse the two ranked lists. The algorithm:

1. Normalizes raw BM25 scores to the `[0, 1]` range using min-max scaling across the candidate set.
2. Normalizes cosine similarities (already in `[-1, 1]`) to `[0, 1]`.
3. Applies a Bayesian prior estimated from the training distribution of BM25 and vector scores for that index to adjust for each scorer's typical confidence level.
4. Computes the joint posterior probability: `P(relevant | bm25_score, vec_score) ∝ P(bm25_score | relevant) × P(vec_score | relevant) × P(relevant)`.
5. Re-ranks all candidates by descending posterior probability.

The prior is updated incrementally as new documents are indexed, so the calibration adapts to the corpus without retraining.

### RRF (Reciprocal Rank Fusion) — NDCG@10: 0.8874

RRF is a simpler rank fusion baseline. For each document, its RRF score is:

```
RRF(d) = Σ 1 / (k + rank_i(d))
```

where `k = 60` is a constant that dampens the influence of very high ranks, and the sum is over both the BM25 ranked list and the vector ranked list. RRF is parameter-free and computationally trivial but does not model the calibration between score distributions.

### Linear Combination Mode

A third mode computes a weighted linear combination:

```
score(d) = α × normalize(bm25(d)) + (1 - α) × normalize(vec(d))
```

where `α` is configurable per-query via the `hybrid_alpha` parameter.

### Configuration

Enable hybrid search globally in `config.toml`:

```toml
[search]
hybrid_scorer = "bayesian"   # Options: "bayesian" | "rrf" | "linear"
hybrid_alpha  = 0.5          # Used only when scorer = "linear"
```

Or set per-request via the environment variable at startup:

```bash
ES_HYBRID_SCORER=bayesian ./indentiagraph serve
```

### Full Hybrid Search Example

```bash
curl -X POST http://localhost:9200/papers/_search \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "match": {
        "abstract": "knowledge graph embedding methods"
      }
    },
    "knn": {
      "field":         "embedding",
      "query_vector":  [0.12, -0.45, 0.88, 0.03, ...],
      "k":             20,
      "num_candidates": 100
    },
    "rank": {
      "hybrid": {
        "retriever_names": ["query", "knn"],
        "scorer":          "bayesian"
      }
    },
    "size": 10
  }'
```

```python
import numpy as np
from sentence_transformers import SentenceTransformer
from elasticsearch import Elasticsearch

es    = Elasticsearch("http://localhost:9200")
model = SentenceTransformer("all-MiniLM-L6-v2")

query_text = "knowledge graph embedding methods"
query_vec  = model.encode(query_text).tolist()

response = es.search(
    index="papers",
    body={
        "query": {
            "match": {"abstract": query_text}
        },
        "knn": {
            "field":          "embedding",
            "query_vector":   query_vec,
            "k":              20,
            "num_candidates": 100
        },
        "rank": {
            "hybrid": {
                "retriever_names": ["query", "knn"],
                "scorer":          "bayesian"
            }
        },
        "size": 10
    }
)

for hit in response["hits"]["hits"]:
    print(f"{hit['_score']:.4f}  {hit['_source']['title']}")
```

---

## SPARQL Extensions for Search (`_ext`)

The `_ext` field in a search request body activates IndentiaDB-specific SPARQL-aware extensions. These are available only on IndentiaDB's ES-compatible API and are ignored by plain Elasticsearch.

### 1. `sparql_enrich` — Enrich Results with RDF Graph Data

After the BM25/hybrid search produces a ranked result list, `sparql_enrich` executes a SPARQL query for each result and merges the graph data into the hit's `_source`.

```python
response = es.search(
    index="papers",
    body={
        "query": {"match": {"abstract": "graph neural network"}},
        "_ext": {
            "sparql_enrich": {
                "sparql": """
                    PREFIX ex:   <http://example.org/>
                    PREFIX foaf: <http://xmlns.com/foaf/0.1/>
                    SELECT ?authorName ?institution WHERE {
                        <{doc_uri}> ex:author ?author .
                        ?author foaf:name  ?authorName ;
                                ex:affiliation ?institution .
                    }
                """,
                "uri_field": "paper_uri",
                "merge_as":  "graph_data"
            }
        }
    }
)

for hit in response["hits"]["hits"]:
    print(hit["_source"]["graph_data"])   # list of SPARQL result rows
```

!!! note "URI Field"
    The `uri_field` must be a field in `_source` that contains the RDF IRI for the document. The placeholder `{doc_uri}` is substituted per result before executing the SPARQL query.

### 2. `kg_boost` — Knowledge Graph Boosting

Boosts documents based on authority signals derived from the RDF knowledge graph — for example, the h-index of the paper's authors or citation counts stored as RDF triples.

```python
response = es.search(
    index="papers",
    body={
        "query": {"match": {"abstract": "transformer attention mechanism"}},
        "_ext": {
            "kg_boost": {
                "sparql": """
                    PREFIX ex:     <http://example.org/>
                    PREFIX schema: <http://schema.org/>
                    SELECT ?boost WHERE {
                        <{doc_uri}> ex:author ?author .
                        ?author ex:hIndex ?h .
                        ?author schema:citation_count ?citations .
                        BIND((?h * 0.7 + LOG(?citations + 1) * 0.3) AS ?boost)
                    }
                """,
                "uri_field":   "paper_uri",
                "boost_field": "boost",
                "max_boost":   5.0
            }
        }
    }
)
```

The `boost` value is multiplied into the BM25/hybrid score. `max_boost` caps it to avoid extreme outliers dominating results.

### 3. `sparql_filter` — Graph Traversal Filter

Filters the search result set using a SPARQL ASK or SELECT query. Only documents for which the query returns `true` (or at least one result) are included in the final hits.

```python
# Only return papers authored by direct reports of manager ex:alice
response = es.search(
    index="papers",
    body={
        "query": {"match": {"abstract": "performance optimization"}},
        "_ext": {
            "sparql_filter": {
                "sparql": """
                    PREFIX ex: <http://example.org/>
                    ASK {
                        <{doc_uri}> ex:author ?author .
                        ?author ex:reportsTo+ ex:alice .
                    }
                """,
                "uri_field": "paper_uri"
            }
        }
    }
)
```

The `ex:reportsTo+` property path traverses the org hierarchy transitively. This is pure SPARQL — any graph pattern is valid.

### 4. `sparql_expand` — Semantic Expansion via RDFS Inference

Expands the query terms by fetching semantically related terms from the RDF knowledge graph (synonyms, narrower/broader concepts, `rdfs:label` variants) before submitting to BM25.

```python
response = es.search(
    index="articles",
    body={
        "query": {"match": {"content": "automobile"}},
        "_ext": {
            "sparql_expand": {
                "sparql": """
                    PREFIX skos:  <http://www.w3.org/2004/02/skos/core#>
                    PREFIX rdfs:  <http://www.w3.org/2000/01/rdf-schema#>
                    SELECT ?term WHERE {
                        ?concept skos:prefLabel "automobile"@en .
                        {
                            ?concept skos:altLabel ?term .
                        } UNION {
                            ?concept skos:narrower/skos:prefLabel ?term .
                        } UNION {
                            ?concept skos:broader/skos:prefLabel ?term .
                        }
                    }
                """,
                "expand_field": "content",
                "boost_original": 2.0,
                "boost_expanded": 0.5
            }
        }
    }
)
```

This automatically adds "car", "vehicle", "motor vehicle", etc. to the query without manual synonym lists.

### 5. `format: "rag_context"` — RAG-Ready Retrieval Format

Returns search results in a format ready to be concatenated directly into an LLM prompt context window, with configurable metadata fields and provenance markers.

```python
response = es.search(
    index="articles",
    body={
        "query": {"match": {"content": "IndentiaDB vector search configuration"}},
        "size": 5,
        "_ext": {
            "format": "rag_context",
            "rag_context": {
                "text_field":    "content",
                "source_field":  "url",
                "title_field":   "title",
                "max_chars":     800,
                "include_score": True
            }
        }
    }
)

# response["_ext"]["rag_context"] is a ready-to-use string
rag_context = response["_ext"]["rag_context"]

prompt = f"""Answer the following question using only the context below.

Context:
{rag_context}

Question: How do I configure vector search in IndentiaDB?
Answer:"""

# Send prompt to your LLM
```

The `rag_context` string contains numbered passages with source attribution:

```
[1] (score: 0.94) IndentiaDB Documentation: Vector Search Configuration
Vector search in IndentiaDB is configured via VectorIndexConfig...
Source: https://docs.indentiadb.nl/features/vector-search

[2] (score: 0.87) Getting Started Guide
To enable HNSW indexing, set dimension and metric in config.toml...
Source: https://docs.indentiadb.nl/getting-started
```

---

## Access-Controlled Search

The Elasticsearch API respects the same security model as the SPARQL and SurrealQL endpoints. Pass the JWT token in the `Authorization` header:

```bash
curl -X POST http://localhost:9200/classified-documents/_search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{"query": {"match": {"content": "budget forecast"}}}'
```

```python
from elasticsearch import Elasticsearch, RequestsHttpConnection
import requests

class BearerAuth(requests.auth.AuthBase):
    def __init__(self, token):
        self.token = token
    def __call__(self, r):
        r.headers["Authorization"] = f"Bearer {self.token}"
        return r

es = Elasticsearch(
    "http://localhost:9200",
    http_auth=None,
    connection_class=RequestsHttpConnection,
    http_compress=True,
    headers={"Authorization": f"Bearer {jwt_token}"}
)

response = es.search(index="classified-documents", body={"query": {"match_all": {}}})
```

The ACL layer (see [Triple-Level ACL](../security/acl.md)) transparently filters results:

- Documents backed by RDF triples with `acl:allowedSid` annotations are only returned if the authenticated user's SID set intersects the allowed SID set.
- Graph-level ACL controls which Elasticsearch indices (which map to named graphs) are visible at all.
- The user **never needs to add ACL conditions** to their queries.

!!! warning "Unauthenticated Search"
    If no `Authorization` header is provided and `default_access = "deny"` is set in config, the request returns `401 Unauthorized`. For public search endpoints, configure an explicit `public` role context in the ACL.

---

## Search Audit Trail

Every search request is logged to the audit trail with the following fields:

```json
{
  "event":      "search",
  "timestamp":  "2025-11-14T09:23:41.882Z",
  "user":       "alice@example.com",
  "roles":      ["reader", "data_scientist"],
  "index":      "papers",
  "query":      {"match": {"abstract": "knowledge graph"}},
  "hits_total": 42,
  "took_ms":    7,
  "request_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "client_ip":  "10.0.0.55"
}
```

Configure the audit log destination in `config.toml`:

```toml
[audit]
enabled        = true
output         = "file"              # "file" | "sparql_graph" | "stdout"
file_path      = "/var/log/indentiadb/audit.jsonl"
log_search     = true
log_reads      = false               # triple-level read events (high volume)
log_writes     = true
log_auth       = true
```

When `output = "sparql_graph"`, audit events are stored as RDF triples in a dedicated named graph (`http://indentiadb.io/audit`) queryable via SPARQL — enabling compliance reports using the same query interface as the rest of the system.
