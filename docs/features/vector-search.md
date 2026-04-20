# Vector Search & RAG

IndentiaDB ships a native vector index with two backends — an **in-memory HNSW/IVF engine** for sub-millisecond recall up to ~500K vectors, and a **disk-backed DiskIVF engine** that scales to 100M+ vectors with 194× less RAM through scalar quantization. Both backends share the same SPARQL, SurrealQL, and LPG query interfaces and live within the same ACID transaction boundary as all other data models — no separate vector database required.

## What is and isn't automatic

It helps to be precise about what "vector search" means in IndentiaDB:

| Capability | Status | Notes |
|------------|--------|-------|
| Insert pre-computed embeddings as RDF literals or SurrealQL fields | ✅ | The embedding lives next to your data as a JSON-array literal or numeric array field |
| ANN search via `vec:approxNear*` SPARQL functions | ✅ | Index is automatically used when the predicate matches an indexed field |
| ANN search via SurrealQL `<\|n,EF\|>` operator | ✅ | See [Vector Search via SurrealQL](#vector-search-via-surrealql) below |
| K-NN over LPG node properties | ✅ | See [Vector K-NN in LPG](#vector-k-nn-in-lpg) below |
| Hybrid scoring (BM25 + vector) via the Elasticsearch `_search` API | ✅ | Bayesian fusion (`ES_HYBRID_SCORER=bayesian`) gives NDCG@10 0.9149 |
| Query-time text → vector via an external embedder | ✅ | Pass `model_id` + `model_text` to a KNN retriever; resolved by the configured `InferenceRegistry` |
| **Auto-embed every literal on insert** | ❌ | Embeddings are not generated server-side. Pre-compute them in your ingest pipeline (e.g. via `embeddingsvc`). |
| **Graph-structure embeddings (node2vec, GraphSAGE, GNN)** | ❌ | Not built in. Treat the graph as the input to an external embedder; write the resulting vectors back as triples or LPG properties. |

In short: IndentiaDB is **vector-aware**, not **auto-vectorizing**. The graph is gevectoriseerd in the sense that any literal or LPG property can carry a vector and be queried with native operators — but generating those vectors is a separate concern owned by the ingest pipeline.

---

## HNSW Index

### What HNSW Is

HNSW (Hierarchical Navigable Small World) is a graph-based approximate nearest-neighbour (ANN) algorithm. It builds a multi-layer proximity graph over the vector space:

- **Layer 0** contains all vectors, connected to their nearest neighbours.
- **Layer 1** contains a random subset (~37% of layer 0), connected more sparsely.
- **Layer 2..M** contain progressively sparser subsets.

Search enters at the top (sparsest) layer, greedily navigates toward the query vector, then descends to the next layer and repeats. This hierarchical structure gives logarithmic search complexity while maintaining high recall.

```
Layer 2:   *                *
           |                |
Layer 1:   * - * - *        * - *
           |   |   |        |   |
Layer 0:   *-*-*-*-*-*-*-*-*-*-*  (all vectors)
                    ↑
              query enters here
```

**Key properties:**
- Recall@10 typically 95–99% at reasonable `n_probe` values.
- Build time: O(N × M × log(N)) where M is the number of neighbours per node.
- Memory: O(N × M × d) where d is the dimension (stored vectors + graph edges).
- Search complexity: O(d × k + n_probe × n/k) where k is the number of coarse clusters and n_probe is the number of clusters searched.

### Configuration

```toml
[vector]
enabled   = true
dimension = 768
metric    = "cosine"   # "cosine" | "l2" | "dot"

[vector.hnsw]
n_lists             = 100    # number of coarse cluster centroids
training_iterations = 25     # k-means training passes
default_n_probe     = 10     # clusters searched at query time
m                   = 16     # neighbours per node (build quality)
ef_construction     = 200    # candidate list size during build
```

| Parameter | Description | Tuning Guidance |
|-----------|-------------|-----------------|
| `dimension` | Vector dimension (must match your embedding model) | Fixed — must match model output |
| `metric` | Similarity function | `cosine` for normalized embeddings (most common), `l2` for raw Euclidean, `dot` for unnormalized inner product |
| `n_lists` | Coarse cluster count (IVF-style partitioning) | Rule of thumb: `sqrt(N)` where N is corpus size |
| `n_probe` | Clusters searched per query | Higher = better recall, slower search. Start at 10, tune for recall vs latency tradeoff |
| `m` | Graph connections per node | Higher = better recall, more memory. 16 is a solid default; use 32–64 for high-dimensional spaces |
| `ef_construction` | Candidate list during index build | Higher = better graph quality, slower build. 200 is a solid default |

!!! tip "Dimension Must Match Your Embedding Model"
    `all-MiniLM-L6-v2` produces 384-dimensional vectors. `all-mpnet-base-v2` produces 768. `text-embedding-ada-002` produces 1536. Set `dimension` to match exactly — a mismatch causes an error at insert time.

---

## DiskIVF — Disk-Backed Vector Index

### What DiskIVF Is

DiskIVF is IndentiaDB's disk-backed vector index with scalar quantization. While the standard `persistent` engine holds all vectors in RAM, DiskIVF stores quantized posting lists on the SurrealKV/TiKV storage backend — reducing RAM usage by up to **194×** at 100M vectors.

This makes it the right choice for corpora that exceed what fits comfortably in memory: enterprise document archives, long-horizon conversation histories, multi-tenant platforms, or any corpus in the tens-to-hundreds of millions of vectors.

### Persistent vs. DiskIVF — When to Use Which

| Criteria | Persistent (in-memory) | DiskIVF (disk-backed) |
|----------|------------------------|-----------------------|
| Corpus size | Up to ~500K vectors | 10M – 100M+ vectors |
| RAM at 100M vectors | ~583 GB | ~3 GB + ~3 GB (ID maps) |
| Disk at 100M vectors | — | ~28 GB (1-bit quantization) |
| Recall@10 | 97–99% | 90–99% (tunable via bit depth) |
| Build requirement | Immediate | Training phase (≥ `LISTS × 39` sample vectors) |
| Query latency | Sub-millisecond | 1–10 ms (cache-dependent) |
| SOAR boundary recall | — | ✅ Soft dual-centroid assignment |

### Architecture

DiskIVF uses a three-tier layout:

```
┌──────────────────────────────────────────────┐
│  Centroids  (RAM)                             │
│  k-means cluster centers — always in memory   │
│  ≈100 centroids × dimension × 4 bytes        │
└──────────────────┬───────────────────────────┘
                   │  score all centroids → pick top n_probe
┌──────────────────▼───────────────────────────┐
│  LRU Cache  (RAM)                             │
│  32 most-recently-used posting lists          │
│  configurable via CACHE_SIZE                  │
└──────────────────┬───────────────────────────┘
                   │  cache miss → fetch from storage
┌──────────────────▼───────────────────────────┐
│  Posting Lists  (Disk / SurrealKV / TiKV)    │
│  Scalar-quantized vectors: 1 / 2 / 4 bits    │
│  Written via InvertedListStore abstraction    │
└──────────────────────────────────────────────┘
```

Search uses **asymmetric distance scoring**: the query vector stays at full `f32` precision while only stored vectors are quantized. This gives materially better recall than symmetric quantization (where the query is also compressed).

### Enabling DiskIVF

Add `ENGINE diskivf` to the `CREATE VECTOR INDEX` DDL statement. All existing query syntax — `vec:approxNearCosine`, SurrealQL `<|k,ef|>`, LPG `VectorKnn` — works unchanged; the engine type is transparent at query time.

**Minimal:**

```sparql
CREATE VECTOR INDEX doc_embeddings
  ON <http://example.org/Document>
  FIELD <http://example.org/embedding>
  METRIC cosine
  DIMENSION 1536
  LISTS 100
  ENGINE diskivf;
```

**Fully tuned:**

```sparql
CREATE VECTOR INDEX doc_embeddings
  ON <http://example.org/Document>
  FIELD <http://example.org/embedding>
  METRIC cosine
  DIMENSION 1536
  LISTS 100
  ENGINE diskivf
  CACHE_SIZE 64
  QUANTIZATION_BITS 2
  SOAR true
  SOAR_THRESHOLD 1.3;
```

### Configuration Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `ENGINE` | `persistent` \| `diskivf` | `persistent` | Index backend. `diskivf` enables disk-backed storage with scalar quantization |
| `LISTS` | integer | `100` | Number of IVF coarse clusters. Rule of thumb: `sqrt(N)` |
| `CACHE_SIZE` | integer | `32` | Posting lists held in RAM LRU cache. Increase for hot-path workloads |
| `QUANTIZATION_BITS` | `1` \| `2` \| `4` | `1` | Bits per dimension. Lower = smaller footprint, lower recall |
| `SOAR` | boolean | `true` | Soft Overlapping Assignment — assigns boundary vectors to two centroids to recover recall at cluster edges |
| `SOAR_THRESHOLD` | float | `1.3` | Distance ratio for dual-centroid assignment. `1.0` disables SOAR; higher values assign more vectors to two clusters |

### Quantization Trade-offs

| Bits | Compression | Bytes/vector (1536-dim) | Recall@10 | Recommended for |
|------|-------------|-------------------------|-----------|-----------------|
| **1** | ~28× | ~216 B | 90–95% | 50M+ vectors, RAM-critical environments |
| **2** | ~14× | ~408 B | 95–98% | 10–50M vectors, balanced workloads |
| **4** | ~7× | ~792 B | 98–99% | Accuracy-sensitive, smaller corpora |

### Capacity Planning

| Corpus | Disk (1-bit) | RAM (centroids + cache) | RAM (ID maps) |
|--------|-------------|-------------------------|---------------|
| 10K vectors | ~2.8 MB | ~2 MB | negligible |
| 1M vectors | ~280 MB | ~20 MB | ~30 MB |
| 10M vectors | ~2.8 GB | ~45 MB | ~300 MB |
| 100M vectors | ~28 GB | ~90 MB | ~3 GB |

!!! warning "Training Required Before First Search"
    DiskIVF must be trained before accepting queries. Training fits `LISTS` k-means centroids on a representative sample — at minimum `LISTS × 39` vectors (e.g. 3,900 vectors for `LISTS 100`). Training runs automatically during `BUILD VECTOR INDEX` and is a one-time cost per index. Calling search on an untrained index returns `AnnError::NotTrained`.

!!! tip "SOAR: Recovering Recall at Cluster Boundaries"
    Vectors near centroid boundaries are the most likely to be missed when `n_probe` is low. SOAR (Soft Overlapping Assignment) solves this by dual-assigning each such vector to its two nearest centroids at build time. At the default threshold of `1.3`, a vector is dual-assigned when its second-nearest centroid is within 1.3× the distance of the nearest. This slightly increases index size but recovers boundary recall without raising `n_probe`.

---

## Rust API for Vector Operations

```rust
use indentiagraph_vector::{
    VectorIndexConfig, SimilarityMetric, VectorIndexSearchConfig,
    PersistentAnnEngine, AnnEngine,
};

// 1. Configure the index
let config = VectorIndexConfig {
    dimension:            768,
    metric:               SimilarityMetric::Cosine,
    n_lists:              100,
    training_iterations:  25,
    default_n_probe:      10,
    ..Default::default()
};

// 2. Create and build the engine
let mut engine = PersistentAnnEngine::new();
engine.build(config).unwrap();

// 3. Train on a representative sample
//    training_vectors: Vec<Vec<f32>>, at least n_lists * 39 vectors
engine.train(training_vectors).unwrap();

// 4. Insert (upsert) documents
engine.upsert("doc1".to_string(), vec![0.12f32, -0.45, 0.88, /* ... 768 total */]).unwrap();
engine.upsert("doc2".to_string(), vec![0.03f32,  0.71, 0.22, /* ... 768 total */]).unwrap();

// 5. Search
let query_vec = vec![0.11f32, -0.42, 0.91, /* ... 768 total */];

let results = engine.search(
    &query_vec,
    &VectorIndexSearchConfig {
        k:       10,
        n_probe: Some(20),  // override default_n_probe for this query
        offset:  0,
    },
).unwrap();

for result in &results {
    println!("id={} score={:.4}", result.id, result.score);
}

// 6. Delete a vector
engine.delete("doc1").unwrap();

// 7. Persist to disk (called automatically on graceful shutdown)
engine.flush().unwrap();
```

The `PersistentAnnEngine` serializes the HNSW graph to the configured storage backend (SurrealKV or TiKV). On restart, the index is loaded from storage — no reindexing required.

---

## Vector Search via SurrealQL

When documents are stored with an `embedding` field, use the built-in HNSW operator `<|k,ef|>` for nearest-neighbour queries:

```sql
-- Find 10 nearest chunks to the query embedding
SELECT id, content, source_url,
       vector::similarity::cosine(embedding, $query) AS score
FROM chunks
WHERE embedding <|10, 40|> $query
ORDER BY score DESC
LIMIT 10;
```

The `<|k, ef|>` syntax is SurrealQL's HNSW operator where `k` is the number of results and `ef` is the dynamic candidate list size (higher = better recall).

**With metadata filtering (pre-filter):**

```sql
-- Only search chunks from documents published after 2023
SELECT id, content, doc_id,
       vector::similarity::cosine(embedding, $query) AS score
FROM chunks
WHERE doc_published > "2023-01-01"
  AND embedding <|10, 40|> $query
ORDER BY score DESC
LIMIT 10;
```

!!! note "Pre-filter vs Post-filter"
    Pre-filtering happens before the ANN search and reduces the search space. This improves latency but may reduce recall if the filtered subset is small. Post-filtering (applying metadata conditions after ANN search) guarantees the ANN search explores the full index at the cost of potentially returning fewer than `k` results.

---

## Vector Search via SPARQL

IndentiaDB exposes vector similarity as native SPARQL filter functions under the
namespace `<http://graph.indentia.ai/vector/functions#>` (conventionally bound
to the `vec:` prefix).

### Available functions

| Function | Backed by index? | Use case |
|----------|------------------|----------|
| `vec:approxNearCosine(?vec, queryVec)` | ✅ HNSW / IVF | Approximate cosine similarity (most common for normalized embeddings) |
| `vec:approxNearL2(?vec, queryVec)` | ✅ HNSW / IVF | Approximate Euclidean distance |
| `vec:approxNearInnerProduct(?vec, queryVec)` | ✅ HNSW / IVF | Approximate dot-product similarity |
| `vec:cosineSimilarity(?a, ?b)` | ❌ exact | Per-row exact computation, no index lookup |
| `vec:l2Distance(?a, ?b)` | ❌ exact | Per-row exact computation, no index lookup |
| `vec:innerProduct(?a, ?b)` | ❌ exact | Per-row exact computation, no index lookup |

The `approxNear*` variants are pushed down into the vector index (HNSW or IVF
depending on the configured backend) and return only the top-k candidates. The
plain similarity functions evaluate per-binding without any index lookup — use
them only when the surrounding pattern has already been narrowed to a small
candidate set.

### Example query

```sparql
PREFIX vec:  <http://graph.indentia.ai/vector/functions#>
PREFIX ex:   <http://example.org/>

SELECT ?doc ?score WHERE {
    ?doc ex:embedding ?vec .
    BIND(vec:approxNearCosine(?vec, $query_vector) AS ?score)
    FILTER(?score > 0.7)
}
ORDER BY DESC(?score)
LIMIT 10
```

The `$query_vector` parameter is passed as a JSON-array literal in the SPARQL
request:

```bash
curl -X POST http://localhost:7001/sparql \
  -H "Content-Type: application/sparql-query" \
  -H "Accept: application/sparql-results+json" \
  -d 'PREFIX vec: <http://graph.indentia.ai/vector/functions#>
      PREFIX ex:  <http://example.org/>
      SELECT ?doc ?score WHERE {
          ?doc ex:embedding ?vec .
          BIND(vec:approxNearCosine(?vec, "[0.12, -0.45, 0.88]") AS ?score)
          FILTER(?score > 0.7)
      }
      ORDER BY DESC(?score) LIMIT 10'
```

### Vector index DDL via SPARQL

Vector indexes are created and managed through SPARQL extension statements.
This keeps the vector layer in lockstep with the RDF data model — no separate
admin API or external orchestration is needed.

```sparql
-- Create an index on a class + property
CREATE VECTOR INDEX docs_emb
  ON ex:Document
  FIELD ex:embedding
  METRIC cosine
  DIMENSION 768
  LISTS 100;

-- Inspect indexes
SHOW VECTOR INDEXES;

-- Rebuild after a backfill or metric change
REBUILD VECTOR INDEX docs_emb;

-- Remove an index (data triples remain untouched)
DROP VECTOR INDEX docs_emb;
```

`METRIC` accepts `cosine`, `l2`, or `inner_product`. `DIMENSION` must match the
embedding-model output exactly. `LISTS` controls IVF coarse-cluster count
(rule of thumb: `sqrt(N)`). Add `ENGINE diskivf` to switch from in-memory to
disk-backed storage — see [DiskIVF](#diskivf-disk-backed-vector-index) for the
full parameter reference and capacity planning guide.

---

## Hybrid Text + Vector Search in SPARQL

Combine `vec:approxNearCosine` with `ql:contains-word` for documents that match both a keyword condition and are semantically similar to the query embedding:

```sparql
PREFIX vec:  <http://graph.indentia.ai/vector/functions#>
PREFIX ql:   <http://qlever.cs.uni-freiburg.de/builtin-functions/>
PREFIX ex:   <http://example.org/>

SELECT ?doc ?score ?textScore WHERE {
    ?doc ex:embedding ?vec ;
         ex:text      ?text .
    BIND(vec:approxNearCosine(?vec, $query_vector) AS ?score)
    BIND(ql:contains-word(?text, "machine learning") AS ?textScore)
    FILTER(?score    > 0.6)
    FILTER(?textScore > 0)
}
ORDER BY DESC(?score + ?textScore)
LIMIT 10
```

This query requires both conditions to be met — a document must contain the phrase "machine learning" AND be semantically close to the query vector. The combined ranking `?score + ?textScore` leverages both signals.

---

## Stored Values with Vector Filtering

IndentiaDB supports storing arbitrary metadata alongside each vector in the HNSW index. This enables efficient post-retrieval filtering without re-querying the main store for common metadata.

```rust
use indentiagraph_vector::{VectorWithPayload, StoredValue};

// Store vector with metadata payload
engine.upsert_with_payload(
    "doc42".to_string(),
    embedding_vec,
    vec![
        StoredValue::String("category".into(), "research".into()),
        StoredValue::Integer("year".into(), 2024),
        StoredValue::Float("citation_count".into(), 157.0),
    ],
).unwrap();

// Search with payload filter
let results = engine.search_with_filter(
    &query_vec,
    &VectorIndexSearchConfig { k: 20, n_probe: Some(30), offset: 0 },
    |payload| {
        payload.get_str("category") == Some("research")
            && payload.get_int("year").map(|y| y >= 2022).unwrap_or(false)
    },
).unwrap();
```

Common stored values: document category, language, tenant ID, access level, publication date. Using stored values avoids a round-trip to the main key-value store for each of the `k` results.

---

## RAG Pipeline (Complete Example)

This section shows a complete, runnable RAG pipeline: from raw documents to answering questions with an LLM.

### Step 1: Chunk Documents

```python
import re
from typing import List

def chunk_text(text: str, chunk_size: int = 512, overlap: int = 64) -> List[str]:
    """Split text into overlapping chunks of approximately chunk_size tokens."""
    # Approximate tokenization by splitting on whitespace
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        chunk_words = words[i : i + chunk_size]
        chunks.append(" ".join(chunk_words))
        i += chunk_size - overlap
    return chunks

# Load and chunk your document
with open("my_document.txt") as f:
    raw_text = f.read()

chunks = chunk_text(raw_text, chunk_size=256, overlap=32)
print(f"Created {len(chunks)} chunks")
```

### Step 2: Generate Embeddings

```python
from sentence_transformers import SentenceTransformer
import numpy as np

model = SentenceTransformer("all-MiniLM-L6-v2")   # 384-dimensional

embeddings = model.encode(
    chunks,
    batch_size=64,
    show_progress_bar=True,
    normalize_embeddings=True,  # L2-normalize for cosine similarity
)

print(f"Embedding shape: {embeddings.shape}")  # (n_chunks, 384)
```

### Step 3: Index in IndentiaDB

```python
import requests
import json

INDENTIA_URL = "http://localhost:7001"

# Create SurrealQL records with embeddings
for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
    record = {
        "id":         f"chunk:{i}",
        "content":    chunk,
        "source":     "my_document.txt",
        "chunk_idx":  i,
        "embedding":  embedding.tolist(),
    }

    response = requests.post(
        f"{INDENTIA_URL}/sql",
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        json={"query": f"""
            CREATE chunks CONTENT {{
                content:   $content,
                source:    $source,
                chunk_idx: $chunk_idx,
                embedding: $embedding
            }}
        """, "vars": {
            "content":   chunk,
            "source":    "my_document.txt",
            "chunk_idx": i,
            "embedding": embedding.tolist(),
        }}
    )
    response.raise_for_status()

print(f"Indexed {len(chunks)} chunks")
```

### Step 4: Retrieve Relevant Chunks

```python
def retrieve_chunks(query: str, k: int = 5) -> list[dict]:
    """Retrieve the k most relevant chunks for a query."""
    query_embedding = model.encode([query], normalize_embeddings=True)[0]

    response = requests.post(
        f"{INDENTIA_URL}/sql",
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        json={
            "query": """
                SELECT id, content, source, chunk_idx,
                       vector::similarity::cosine(embedding, $query) AS score
                FROM chunks
                WHERE embedding <|$k, 40|> $query
                ORDER BY score DESC
                LIMIT $k
            """,
            "vars": {
                "query": query_embedding.tolist(),
                "k":     k,
            }
        }
    )
    response.raise_for_status()
    results = response.json()[0]["result"]
    return results

chunks_retrieved = retrieve_chunks("How does IndentiaDB handle vector indexing?", k=5)
for c in chunks_retrieved:
    print(f"[{c['score']:.3f}] {c['content'][:100]}...")
```

### Step 5: Assemble Context and Call LLM

```python
import openai   # or any other LLM client

def answer_question(question: str, k: int = 5) -> str:
    """Retrieve relevant context and answer a question using an LLM."""
    relevant_chunks = retrieve_chunks(question, k=k)

    # Build context string
    context_parts = []
    for i, chunk in enumerate(relevant_chunks, 1):
        context_parts.append(
            f"[{i}] (relevance: {chunk['score']:.2f})\n"
            f"Source: {chunk['source']}, chunk {chunk['chunk_idx']}\n"
            f"{chunk['content']}"
        )
    context = "\n\n---\n\n".join(context_parts)

    prompt = f"""You are a helpful assistant. Answer the question using ONLY the provided context.
If the context does not contain enough information, say so explicitly.

Context:
{context}

Question: {question}

Answer:"""

    client = openai.OpenAI()
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
        max_tokens=512,
    )

    return response.choices[0].message.content

answer = answer_question("What HNSW parameters should I use for a 10M document corpus?")
print(answer)
```

---

## Knowledge Graph RAG

IndentiaDB uniquely combines vector similarity retrieval with RDF-star provenance annotations. This enables RAG with confidence-weighted context — the LLM receives not just relevant text but also the source and confidence of each knowledge graph fact.

### Querying RDF-star Provenance for RAG Context

```sparql
PREFIX ig:    <http://indentiadb.nl/ontology/>
PREFIX foaf:  <http://xmlns.com/foaf/0.1/>
PREFIX ex:    <http://example.org/>

SELECT ?subject ?predicate ?object ?source ?confidence ?lastVerified
WHERE {
    << ?subject ?predicate ?object >>
        ig:source       ?source ;
        ig:confidence   ?confidence ;
        ig:lastVerified ?lastVerified .

    FILTER (?confidence > 0.7)
}
ORDER BY DESC(?confidence)
LIMIT 10
```

### Storing Facts with Provenance

```sparql
PREFIX ig:  <http://indentiadb.nl/ontology/>
PREFIX ex:  <http://example.org/>

INSERT DATA {
    GRAPH <http://example.org/knowledge> {
        ex:IndentiaDB ex:hasFeature ex:HNSWIndex .

        << ex:IndentiaDB ex:hasFeature ex:HNSWIndex >>
            ig:source       <https://arxiv.org/abs/1603.09320> ;
            ig:confidence   0.95 ;
            ig:lastVerified "2025-09-01T00:00:00Z"^^xsd:dateTime ;
            ig:extractedBy  ex:AutoExtractorV2 .
    }
}
```

### Complete Knowledge Graph RAG Pipeline

```python
import requests

SPARQL_ENDPOINT = "http://localhost:7001/sparql"
CONFIDENCE_THRESHOLD = 0.7

def fetch_kg_context(topic_uri: str) -> list[dict]:
    """Fetch high-confidence RDF-star facts about a topic for RAG context."""
    sparql_query = f"""
        PREFIX ig:   <http://indentiadb.nl/ontology/>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

        SELECT ?subject ?predName ?object ?source ?confidence WHERE {{
            << ?subject ?predicate ?object >>
                ig:source     ?source ;
                ig:confidence ?confidence .

            OPTIONAL {{ ?predicate rdfs:label ?predName . }}
            FILTER (?confidence > {CONFIDENCE_THRESHOLD})
            FILTER (STRSTARTS(STR(?subject), STR(<{topic_uri}>)))
        }}
        ORDER BY DESC(?confidence)
        LIMIT 20
    """

    response = requests.post(
        SPARQL_ENDPOINT,
        headers={
            "Content-Type": "application/sparql-query",
            "Accept":       "application/sparql-results+json",
        },
        data=sparql_query,
    )
    response.raise_for_status()
    bindings = response.json()["results"]["bindings"]

    facts = []
    for b in bindings:
        facts.append({
            "subject":    b["subject"]["value"],
            "predicate":  b.get("predName", b["predicate"])["value"],
            "object":     b["object"]["value"],
            "source":     b["source"]["value"],
            "confidence": float(b["confidence"]["value"]),
        })
    return facts


def kg_rag_answer(question: str, topic_uri: str) -> str:
    """Answer a question using KG facts + vector-retrieved chunks."""
    import openai

    # Fetch structured KG facts
    facts = fetch_kg_context(topic_uri)

    # Fetch unstructured relevant chunks
    query_embedding = model.encode([question], normalize_embeddings=True)[0]
    chunks = retrieve_chunks(question, k=3)

    # Build context
    fact_lines = "\n".join(
        f"  - [{f['confidence']:.0%} confidence] {f['subject']} {f['predicate']} "
        f"{f['object']} (source: {f['source']})"
        for f in facts
    )
    chunk_lines = "\n\n".join(c["content"] for c in chunks)

    context = f"""Structured Knowledge Graph Facts (confidence-weighted):
{fact_lines}

Unstructured Document Excerpts:
{chunk_lines}"""

    client = openai.OpenAI()
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{
            "role": "user",
            "content": (
                f"Answer the question using the knowledge graph facts and document "
                f"excerpts below. Cite confidence levels where relevant.\n\n"
                f"{context}\n\nQuestion: {question}\nAnswer:"
            )
        }],
        temperature=0.1,
    )
    return response.choices[0].message.content


answer = kg_rag_answer(
    question="What is the HNSW index based on?",
    topic_uri="http://example.org/HNSWIndex"
)
print(answer)
```

!!! tip "Why Knowledge Graph RAG?"
    Plain vector RAG retrieves semantically similar text but loses structured relationships and provenance. KG RAG adds: (1) explicit fact triples with confidence weights, (2) source citations the LLM can reference, (3) structured relationship traversal for multi-hop reasoning, and (4) temporal validity from bitemporal annotations (see [Bitemporal](bitemporal.md)).

---

## Vector K-NN in LPG

In addition to the HNSW-backed vector search via SurrealQL and SPARQL, IndentiaDB supports K-nearest-neighbour queries **directly on LPG node properties**. This is useful when embeddings are stored as node properties in the LPG projection (e.g., derived from RDF literals or document fields).

### How It Works

The `VectorKnn` query kind performs a brute-force scan over nodes that have the specified property, computes a similarity/distance score for each, and returns the top-k results above the (optional) threshold. No separate index is required — the scan runs in-process on the in-memory CSR graph.

For high-cardinality graphs, consider filtering with `filter.label` to reduce the candidate set before scoring.

### Request

```json
POST /lpg/query
Authorization: Bearer <token>
Content-Type: application/json

{
  "kind": {
    "VectorKnn": {
      "property": "embedding",
      "query_vector": [0.021, -0.039, 0.085, "..."],
      "k": 10,
      "metric": "cosine",
      "threshold": 0.75,
      "filter": {
        "label": "Document",
        "properties": { "language": "en" }
      }
    }
  },
  "return_fields": ["id", "title", "author"]
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `property` | string | Yes | Node property name storing the embedding |
| `query_vector` | array of float | Yes | The query embedding vector |
| `k` | integer | Yes | Maximum number of results to return |
| `metric` | string | No | `"cosine"` (default), `"l2"`, or `"dot"` |
| `threshold` | float | No | Minimum score cutoff: cosine ≥ threshold; L2 ≤ threshold |
| `filter.label` | string | No | Restrict candidates to nodes with this label |
| `filter.properties` | object | No | Additional property equality filters on candidates |

### Response

```json
{
  "rows": [
    { "id": "http://example.org/doc1", "title": "Graph Databases", "author": "Smith", "score": 0.94 },
    { "id": "http://example.org/doc2", "title": "Knowledge Graphs", "author": "Jones", "score": 0.88 }
  ],
  "total": 2
}
```

The `score` field is always included:
- **cosine** / **dot**: higher is better
- **l2**: lower is better (Euclidean distance)

### Example: Semantic Document Search in LPG

```bash
# First, insert documents with embeddings via SPARQL
curl -X POST http://localhost:7001/update \
  -H "Content-Type: application/sparql-update" \
  -d '
  PREFIX ex: <http://example.org/>
  INSERT DATA {
    ex:doc1 a ex:Document ;
            ex:title     "Graph Databases" ;
            ex:embedding "[0.1, 0.2, 0.3]" .
    ex:doc2 a ex:Document ;
            ex:title     "Knowledge Graphs" ;
            ex:embedding "[0.15, 0.25, 0.28]" .
  }'

# Then query by vector similarity in the LPG
curl -X POST http://localhost:7001/lpg/query \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "kind": {
      "VectorKnn": {
        "property": "embedding",
        "query_vector": [0.12, 0.22, 0.31],
        "k": 5,
        "metric": "cosine",
        "threshold": 0.8,
        "filter": { "label": "http://example.org/Document" }
      }
    },
    "return_fields": ["id", "title"]
  }'
```

### Combining VectorKnn with Graph Algorithms

A powerful pattern is to retrieve semantically similar nodes with `VectorKnn`, then run a graph algorithm on the resulting subgraph. For example:

1. `VectorKnn` → find the 50 most similar `Article` nodes to a query embedding
2. Extract node IDs from the response
3. `POST /algo/pagerank` → rank those 50 nodes by their graph-structural importance

This combines semantic relevance (vector similarity) with structural authority (PageRank) for superior result ranking.
