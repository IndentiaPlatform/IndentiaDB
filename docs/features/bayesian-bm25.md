# Bayesian BM25 (BB25)

IndentiaDB implements **Bayesian BM25 (BB25)** — a probabilistic framework that converts raw BM25 scores into calibrated relevance probabilities and fuses them with dense vector similarities in a unified probability space. The result is a hybrid ranker that consistently outperforms both BM25-only and kNN-only search.

**Benchmark result:** NDCG@10 = **0.9149** on the Olympics dataset (BM25 alone: 0.71, kNN alone: 0.78).

---

## Why BM25 Scores Are Hard to Fuse Directly

Standard BM25 produces an unbounded score (e.g. 3.7, 12.4, 0.2) that varies by corpus size, query length, and field length. Dense vector search produces cosine similarity in [−1, 1]. Directly adding these numbers produces garbage — they live in completely different numerical spaces.

Two common workarounds both have serious problems:

| Method | Problem |
|--------|---------|
| **Linear combination** `α·bm25 + (1−α)·cosine` | BM25 magnitude dominates; α must be retuned per corpus |
| **Reciprocal Rank Fusion (RRF)** `1/(k+rank)` | Throws away score magnitude; equal weight regardless of confidence |

BB25 solves this by **calibrating both signals into probability space** before fusion.

---

## Architecture

```
BM25 scores ──► BayesianProbabilityTransform ──► P(relevant | BM25)  ─┐
                                                                        ├─► log-odds fusion ──► ranked list
cosine sim  ──► cosine_to_probability()        ──► P(relevant | kNN)  ─┘
```

Three components do the work:

1. **`BayesianProbabilityTransform`** — maps BM25 scores to calibrated probabilities
2. **`cosine_to_probability`** — maps cosine similarity to probability
3. **Balanced log-odds fusion** — blends both in logit space with min-max normalisation

---

## Step 1: BM25 Score Calibration

### The Sigmoid Likelihood

The BM25 score `s` is converted to a likelihood via a learned sigmoid:

```
L(s) = σ(α · (s − β))
```

where:

- **`α`** (steepness) — how sharply the curve transitions from non-relevant to relevant; auto-estimated as `1 / std(scores)`
- **`β`** (midpoint) — the BM25 score at which relevance probability is 0.5; auto-estimated as `median(scores)`

Both parameters can be auto-estimated from the BM25 score distribution at query time (zero-config), overridden per-query, or learned offline via gradient descent using relevance labels.

### Composite Prior

The likelihood alone ignores query-specific context. BB25 adds a **composite prior** that incorporates term frequency and document length:

```
P_tf(tf)            = 0.2 + 0.7 · min(1, tf / 10)
P_norm(doc_len_ratio) = 0.3 + 0.6 · (1 − |doc_len_ratio − 0.5| · 2)

P_composite(tf, doc_len_ratio) = clamp(0.7·P_tf + 0.3·P_norm,  0.1, 0.9)
```

Where `doc_len_ratio = doc_len / avg_doc_len`.

The intuition:
- A term appearing many times in a short document is a stronger signal than a single occurrence in a long document.
- The composite prior prevents extreme probability values while encoding this domain knowledge.

### Bayesian Posterior

The final calibrated probability combines likelihood, prior, and optionally a corpus-level base rate via a two-step Bayes update:

```
Step 1:  P₁ = (L · P_composite) / (L · P_composite + (1−L) · (1−P_composite))

Step 2 (if base_rate set):
         P₂ = (P₁ · base_rate) / (P₁ · base_rate + (1−P₁) · (1−base_rate))
```

The **base rate** encodes corpus-level relevance density — estimated as the fraction of documents scoring above the 95th percentile. A sparse corpus (few relevant documents) gets a low base rate (e.g. 0.03), which down-weights marginal BM25 hits.

### Full Pipeline

```
BM25 score
    ↓
L = σ(α · (s − β))                  # sigmoid likelihood
    ↓
P_composite = f(tf, doc_len_ratio)   # composite prior
    ↓
P₁ = Bayes(L, P_composite)          # first update
    ↓
P₂ = Bayes(P₁, base_rate)           # second update (corpus prior)
    ↓
calibrated probability ∈ (0, 1)
```

---

## Step 2: Cosine Similarity Calibration

Cosine similarity `c ∈ [−1, 1]` is mapped to probability via a simple linear transform:

```
P(kNN | c) = clamp((1 + c) / 2,  ε,  1−ε)
```

This puts cosine similarity on the same [0, 1] scale as the BM25 posterior, enabling direct comparison.

---

## Step 3: Log-Odds Fusion

Once both signals are in probability space, they are fused via **balanced log-odds fusion**:

```
logit_bm25 = log(P_bm25 / (1 − P_bm25))    # convert to log-odds
logit_knn  = log(P_knn  / (1 − P_knn ))

bm25_norm  = min_max_normalize(logit_bm25)  # normalise each source
knn_norm   = min_max_normalize(logit_knn)   # independently to [0,1]

score = weight · knn_norm + (1 − weight) · bm25_norm
```

Documents present in only one source get `logit(0.5) = 0.0` — the neutral "no information" value. This avoids penalising documents that happen to be absent from one retriever's top-k window.

The `weight` parameter (default `0.5`) controls the kNN/BM25 balance and can be tuned per-query.

---

## Auto-Estimation vs. Manual Tuning

| Parameter | Auto-estimate | Manual override |
|-----------|--------------|-----------------|
| `alpha` | `1 / std(bm25_scores)` | `"alpha": 2.0` in query |
| `beta` | `median(bm25_scores)` | `"beta": 4.0` in query |
| `base_rate` | fraction above 95th percentile | `"base_rate": 0.03` in query |
| `weight` | `0.5` | `"weight": 0.7` in query |

Auto-estimation runs at query time from the BM25 result set — no offline training required. For best results on a stable corpus, use `fit()` to learn `alpha`/`beta` from labeled data.

---

## Training Modes

Three training modes are supported for offline parameter learning:

| Mode | Description |
|------|-------------|
| **`Balanced` (default)** | Train on sigmoid likelihood: `P = σ(α·(s−β))` |
| **`PriorAware`** | Full Bayesian posterior with composite prior during training |
| **`PriorFree`** | Same training as Balanced, but at inference uses `prior = 0.5` |

Use `PriorAware` when you have tf and doc_len metadata in your training labels.

---

## Gating Functions

Before aggregating logits across multi-field or multi-hop queries, a **gating function** controls how uninformative (negative) log-odds contribute:

| Gating | Formula | Use case |
|--------|---------|---------|
| `NoGating` | `logit` unchanged | Default |
| `Relu` | `max(0, logit)` | MAP estimate under sparse prior (Theorem 6.5.3) |
| `Swish` | `logit · σ(logit)` | Bayes estimate under sparse prior (Theorem 6.7.4) |
| `GeneralizedSwish(β)` | `logit · σ(β · logit)` | Tunable (Theorem 6.7.6) |
| `Gelu` | `logit · σ(1.702 · logit)` | GELU activation analogue (Theorem 6.8.1) |

`Relu` is the most conservative — negative evidence is discarded rather than allowed to lower the score.

---

## Configuration

### Enable Globally (config.toml)

```toml
[search]
hybrid_scorer = "bayesian"   # "bayesian" | "rrf" | "linear"
```

### Enable via Environment Variable

```bash
ES_HYBRID_SCORER=bayesian indentiagraph serve
```

### Per-Query Override (Elasticsearch API)

```json
POST /my-index/_search
{
  "retriever": {
    "bayesian": {
      "weight": 0.6,
      "rank_window_size": 100,
      "retrievers": [
        {
          "standard": {
            "query": { "match": { "content": "SPARQL federation" } }
          }
        },
        {
          "knn": {
            "field": "embedding",
            "query_vector": [0.12, -0.34, 0.89],
            "k": 100,
            "num_candidates": 200
          }
        }
      ]
    }
  },
  "size": 10
}
```

### With Manual Parameter Override

```json
{
  "retriever": {
    "bayesian": {
      "weight": 0.7,
      "alpha": 1.5,
      "beta": 6.0,
      "base_rate": 0.03,
      "rank_window_size": 200,
      "retrievers": [...]
    }
  }
}
```

### With Explain

```json
{
  "retriever": {
    "bayesian": {
      "weight": 0.5,
      "retrievers": [...]
    }
  },
  "explain": true
}
```

The `_explanation` field in each hit shows the fused score breakdown:

```json
"_explanation": {
  "value": 0.812,
  "description": "bayesian_hybrid",
  "details": [{
    "bm25_logit_norm": 0.743,
    "knn_logit_norm": 0.881,
    "weight": 0.5
  }]
}
```

---

## Comparison: BB25 vs RRF vs Linear

| | BB25 | RRF | Linear |
|--|------|-----|--------|
| **Uses score magnitude** | Yes | No (rank only) | Yes |
| **Calibrated to [0,1]** | Yes | Yes (1/(k+r)) | No |
| **Handles missing docs** | Neutral prior (0.5) | Absent = 0 | Absent = 0 |
| **Corpus-adaptive** | Auto-estimates α/β | Fixed k=60 | Manual α |
| **Per-query tunable** | weight, α, β, base_rate | k | α |
| **NDCG@10 (Olympics)** | **0.9149** | 0.847 | 0.831 |

---

## SurrealQL Integration

Hybrid search with BB25 is also available via SurrealQL using the `search::bayesian` function:

```sql
SELECT
    id,
    title,
    search::bayesian(content_bm25, embedding, 0.6) AS score
FROM documents
WHERE content @@ 'knowledge graph federation'
ORDER BY score DESC
LIMIT 10;
```

The function signature: `search::bayesian(bm25_field, vector_field, weight) → f64`

---

## References

- *"Bayesian BM25: A Probabilistic Framework for Hybrid Text and Vector Search"*
- [bb25 Rust reference implementation](https://github.com/instructkr/bb25)
- Python reference: Cognica bayesian-bm25
- IndentiaDB source: `indentiagraph-storage/src/text_index/bayesian.rs`
