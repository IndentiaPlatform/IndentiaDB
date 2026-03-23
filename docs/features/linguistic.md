# Linguistic Processing

IndentiaDB includes a full-featured linguistic processing engine that powers its BM25 full-text search and Elasticsearch-compatible API. The engine provides tokenization, normalization, stemming, stop word removal, synonym expansion, phonetic matching, and language detection -- all configurable per index and per field. Every text analysis component is implemented natively in Rust, with no JVM or external process dependencies.

---

## Text Analysis Pipeline

Every document field passes through a configurable analysis pipeline before being indexed. The pipeline follows a strict four-stage architecture:

```
Input Text --> Char Filters --> Tokenizer --> Token Filters --> Indexed Tokens
```

| Stage | Purpose | Examples |
|-------|---------|----------|
| **Char Filters** | Pre-tokenization character transformations | HTML stripping, character mapping, pattern replacement |
| **Tokenizer** | Split text into individual tokens | Standard (Unicode word boundaries), whitespace, N-gram, CJK bigrams |
| **Token Filters** | Post-tokenization transformations | Lowercase, stop words, stemming, synonyms, phonetic encoding, ASCII folding |
| **Output** | Final indexed tokens with position and offset metadata | Used by BM25 scoring, phrase matching, highlighting |

Each stage is independently configurable. A custom analyzer defines one tokenizer and zero or more char filters and token filters, applied in order.

---

## Tokenizers

IndentiaDB supports seven tokenizer types. Each tokenizer determines how raw text is split into individual tokens.

| Tokenizer | Description | Best For |
|-----------|-------------|----------|
| `Standard` | Unicode word segmentation (UAX #29). Splits on word boundaries, removes most punctuation. | General-purpose text search |
| `Whitespace` | Splits on whitespace characters only. Preserves punctuation attached to tokens. | Log messages, identifiers |
| `Letter` | Splits on non-letter characters. Produces tokens containing only letters. | Simple natural language text |
| `NGram` | Character N-grams of configurable length. | Substring matching, fuzzy search |
| `EdgeNGram` | N-grams anchored to the start of each token. | Autocomplete / search-as-you-type |
| `Pattern` | Splits on a configurable regex pattern. | Custom delimiters, structured text |
| `CJK` | Bigram tokenizer for Chinese, Japanese, and Korean text. | CJK language content |

### Tokenizer Configuration

```toml
# Standard tokenizer (default)
[search.analyzers.default]
tokenizer = "standard"

# N-gram tokenizer for substring matching
[search.analyzers.autocomplete]
tokenizer = { type = "ngram", min_gram = 2, max_gram = 4 }

# Edge N-gram for search-as-you-type
[search.analyzers.suggest]
tokenizer = { type = "edge_ngram", min_gram = 1, max_gram = 15 }

# Pattern tokenizer splitting on hyphens and underscores
[search.analyzers.identifiers]
tokenizer = { type = "pattern", pattern = "[\\-_]+" }

# CJK bigram tokenizer
[search.analyzers.cjk]
tokenizer = "cjk"
```

### Tokenizer Examples

```
Standard tokenizer:
  Input:  "IndentiaDB supports SPARQL 1.2 and GeoSPARQL."
  Output: ["IndentiaDB", "supports", "SPARQL", "1.2", "and", "GeoSPARQL"]

Whitespace tokenizer:
  Input:  "error_code=42 status=failed"
  Output: ["error_code=42", "status=failed"]

NGram(2, 3) tokenizer:
  Input:  "graph"
  Output: ["gr", "gra", "ra", "rap", "ap", "aph", "ph"]

EdgeNGram(1, 4) tokenizer:
  Input:  "search"
  Output: ["s", "se", "sea", "sear"]

CJK tokenizer:
  Input:  "knowledge graph"   (in Chinese characters)
  Output: bigram pairs of adjacent characters
```

---

## Token Filters

Token filters transform the token stream produced by the tokenizer. Multiple filters are applied in order, forming a processing chain.

### Lowercase

Converts all tokens to lowercase. This is almost always the first filter in any analyzer.

```toml
[[search.analyzers.my_analyzer.filters]]
type = "lowercase"
```

### Stop Words

Removes common words that carry little semantic meaning. IndentiaDB ships built-in stop word lists for all supported languages.

```toml
[[search.analyzers.my_analyzer.filters]]
type = "stop_words"
language = "en"
custom = ["etc", "ie", "eg"]    # Additional custom stop words
```

Built-in stop word lists are available for: English, Dutch, German, French, Spanish, Italian, Portuguese, Russian, Arabic, Chinese, Japanese, and Korean.

### Stemming

Reduces words to their root form so that morphological variants match. IndentiaDB supports multiple stemming algorithms:

| Algorithm | Languages | Aggressiveness | Notes |
|-----------|-----------|----------------|-------|
| `porter` | English | Moderate | Original Porter algorithm |
| `porter2` | English | Moderate | Improved Porter2 / Snowball (default) |
| `snowball` | Multi-language | Moderate | Snowball stemmers for 12 languages |
| `lovins` | English | Aggressive | Single-pass, fast |
| `lancaster` | English | Very aggressive | Iterative, heavy reduction |
| `dutch` | Dutch | Moderate | Snowball Dutch variant |
| `german` | German | Moderate | Snowball German variant |
| `french` | French | Moderate | Snowball French variant |
| `spanish` | Spanish | Moderate | Snowball Spanish variant |
| `hunspell` | Any | Dictionary-based | Requires a Hunspell dictionary file |

```toml
# Porter2 stemmer (English, default)
[[search.analyzers.english.filters]]
type = "stemmer"
algorithm = "porter2"

# Snowball stemmer for Dutch
[[search.analyzers.dutch.filters]]
type = "stemmer"
algorithm = { type = "snowball", language = "nl" }

# Hunspell dictionary-based stemmer
[[search.analyzers.hunspell_de.filters]]
type = "stemmer"
algorithm = { type = "hunspell", dictionary = "/etc/indentiadb/dicts/de_DE.dic" }
```

#### Stemming Examples

```
Porter2 (English):
  "running"    --> "run"
  "connections" --> "connect"
  "organized"  --> "organ"

Dutch stemmer:
  "fietsen"    --> "fiets"
  "huizen"     --> "huiz"
  "werknemers" --> "werknem"

German stemmer:
  "Verbindungen" --> "verbind"
  "Arbeitsplatz"  --> "arbeitsplatz"
```

### ASCII Folding

Converts Unicode characters to their ASCII equivalents. Essential for searching text with accented characters using plain ASCII queries.

```toml
[[search.analyzers.my_analyzer.filters]]
type = "ascii_folding"
```

```
"cafe"  matches "cafe"
"Zurich" matches "Zurich"
"resume" matches "resume"
```

### Length Filter

Removes tokens shorter or longer than specified bounds:

```toml
[[search.analyzers.my_analyzer.filters]]
type = "length"
min = 2
max = 50
```

### Trim

Removes leading and trailing whitespace from tokens:

```toml
[[search.analyzers.my_analyzer.filters]]
type = "trim"
```

### Deduplication

Removes duplicate tokens at the same position (useful after synonym expansion):

```toml
[[search.analyzers.my_analyzer.filters]]
type = "dedup"
```

### Shingle

Produces token N-grams (multi-word tokens) for phrase-level matching:

```toml
[[search.analyzers.my_analyzer.filters]]
type = "shingle"
min_size = 2
max_size = 3
```

```
Input tokens: ["knowledge", "graph", "database"]
Shingles:     ["knowledge graph", "graph database", "knowledge graph database"]
```

### Word Delimiter

Splits tokens on case transitions, letter-digit boundaries, and configurable delimiters:

```toml
[[search.analyzers.my_analyzer.filters]]
type = "word_delimiter"
```

```
"PowerShell"  --> ["Power", "Shell"]
"Wi-Fi"       --> ["Wi", "Fi"]
"SD3500"      --> ["SD", "3500"]
```

---

## Synonym Expansion

Synonym expansion allows queries to match documents containing equivalent terms. IndentiaDB supports two modes: explicit synonym rules and synonym dictionaries loaded from files.

### Synonym Rules

Define synonyms inline in the analyzer configuration:

```toml
[[search.analyzers.my_analyzer.filters]]
type = "synonym"
expand = true
rules = [
    "automobile, car, vehicle",
    "quick, fast, speedy",
    "big, large, enormous => huge",
]
```

**Bidirectional rules** (comma-separated): All terms are interchangeable. A query for "car" also matches "automobile" and "vehicle".

**Directional rules** (with `=>`): Only the left-hand terms expand to the right-hand term. A query for "big" matches "huge", but "huge" does not match "big".

### Synonym Dictionary File

For large synonym sets, load from a file:

```toml
[[search.analyzers.my_analyzer.filters]]
type = "synonym"
expand = true
dictionary = "/etc/indentiadb/synonyms/medical.txt"
```

Dictionary file format (one rule per line):

```
# Medical synonyms
heart attack, myocardial infarction, MI
high blood pressure, hypertension
paracetamol, acetaminophen
```

### Synonym Expansion in Search

```bash
# With synonym expansion enabled, this query:
curl -X POST http://localhost:9200/articles/_search \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "match": {
        "content": {
          "query": "automobile safety",
          "analyzer": "my_analyzer"
        }
      }
    }
  }'

# ...also matches documents containing "car safety", "vehicle safety", etc.
```

!!! tip "Index-Time vs Query-Time Synonyms"
    By default, synonyms are expanded at index time -- meaning synonym variants are stored in the inverted index alongside the original term. This is faster at query time but requires re-indexing when synonyms change. Set `expand = false` to apply synonyms only at query time, which allows synonym dictionary updates without re-indexing at the cost of slightly slower queries.

---

## Phonetic Matching

Phonetic encoders convert tokens to phonetic codes so that words that sound alike match each other, even when spelled differently. This is valuable for name search, address matching, and correcting misspellings.

### Supported Encoders

| Encoder | Origin | Best For | Example |
|---------|--------|----------|---------|
| `soundex` | American Census (1880s) | English surnames | "Robert" and "Rupert" both produce `R163` |
| `metaphone` | Lawrence Philips (1990) | English words | "Smith" and "Schmidt" both produce `SM0` |
| `double_metaphone` | Lawrence Philips (2000) | Multi-origin names | Returns primary + alternate code |
| `cologne` | Hans Postel (1969) | German names and words | "Mueller" and "Muller" both produce `657` |

### Configuration

```toml
# Add phonetic encoding as a token filter
[[search.analyzers.name_search.filters]]
type = "phonetic"
encoder = "double_metaphone"

# Full name search analyzer
[search.analyzers.name_search]
tokenizer = "standard"
filters = [
    { type = "lowercase" },
    { type = "ascii_folding" },
    { type = "phonetic", encoder = "double_metaphone" },
]
```

### Phonetic Search Example

```bash
# Search for a person by approximate name
curl -X POST http://localhost:9200/contacts/_search \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "match": {
        "name.phonetic": {
          "query": "Steven",
          "analyzer": "name_search"
        }
      }
    }
  }'

# Matches: "Steven", "Stephen", "Stefan", "Stephan"
```

!!! note "Phonetic Fields"
    Phonetic encoding is typically applied to a sub-field (e.g., `name.phonetic`) rather than the primary field, so that exact matches on the primary field still work and phonetic matching is available as a fallback or boost signal.

---

## Language-Specific Analyzers

IndentiaDB ships pre-configured analyzers for common languages. Each language analyzer includes the appropriate tokenizer, stop word list, and stemmer.

### Supported Languages

| Language | ISO Code | Stemmer | Stop Words | CJK Tokenizer |
|----------|----------|---------|------------|----------------|
| English | `en` | Porter2 | 174 words | No |
| Dutch | `nl` | Snowball Dutch | 119 words | No |
| German | `de` | Snowball German | 232 words | No |
| French | `fr` | Snowball French | 164 words | No |
| Spanish | `es` | Snowball Spanish | 313 words | No |
| Italian | `it` | Snowball Italian | 279 words | No |
| Portuguese | `pt` | Snowball Portuguese | 203 words | No |
| Russian | `ru` | Snowball Russian | 243 words | No |
| Arabic | `ar` | Snowball Arabic | 162 words | No |
| Chinese | `zh` | None | Minimal | Yes (CJK bigrams) |
| Japanese | `ja` | None | Minimal | Yes (CJK bigrams) |
| Korean | `ko` | None | Minimal | Yes (CJK bigrams) |

### Using a Built-In Language Analyzer

```toml
# Use the Dutch analyzer for a specific index
[search.indexes.dutch_articles]
analyzer = "dutch"

# Or reference by language code
[search.indexes.german_articles]
analyzer = { language = "de" }
```

### Custom Language Analyzer

Build a custom analyzer with language-specific components:

```toml
[search.analyzers.dutch_full]
language = "nl"
tokenizer = "standard"

[[search.analyzers.dutch_full.filters]]
type = "lowercase"

[[search.analyzers.dutch_full.filters]]
type = "stop_words"
language = "nl"
custom = ["etc", "bv", "nv"]

[[search.analyzers.dutch_full.filters]]
type = "stemmer"
algorithm = "dutch"

[[search.analyzers.dutch_full.filters]]
type = "ascii_folding"

[[search.analyzers.dutch_full.filters]]
type = "synonym"
rules = [
    "auto, wagen, voertuig",
    "computer, pc, laptop",
]
```

---

## Language Detection

IndentiaDB can automatically detect the language of a text field and apply the appropriate language-specific analyzer. Detection uses a statistical n-gram model that returns a confidence score between 0.0 and 1.0.

### Configuration

```toml
[search.indexes.multilingual_docs]
# Enable automatic language detection
language_detection = true
# Minimum confidence to apply a language-specific analyzer (fallback: standard)
language_detection_threshold = 0.7
# Default language when detection confidence is below threshold
default_language = "en"
```

### Detection API

```bash
curl -X POST http://localhost:7001/api/v1/detect-language \
  -H "Content-Type: application/json" \
  -d '{"text": "Dit is een voorbeeldzin in het Nederlands."}'
```

```json
{
  "language": "Dutch",
  "iso_code": "nl",
  "confidence": 0.94,
  "alternatives": [
    {"language": "German", "iso_code": "de", "confidence": 0.03},
    {"language": "English", "iso_code": "en", "confidence": 0.02}
  ]
}
```

---

## Custom Analyzer Configuration

### TOML Configuration

Define custom analyzers in `config.toml` under `[search.analyzers]`:

```toml
# A medical document analyzer
[search.analyzers.medical]
tokenizer = "standard"

[[search.analyzers.medical.char_filters]]
type = "pattern_replace"
pattern = "\\b(Dr|Prof|Mr|Mrs)\\.\\s*"
replacement = ""

[[search.analyzers.medical.filters]]
type = "lowercase"

[[search.analyzers.medical.filters]]
type = "stop_words"
language = "en"

[[search.analyzers.medical.filters]]
type = "synonym"
dictionary = "/etc/indentiadb/synonyms/medical.txt"
expand = true

[[search.analyzers.medical.filters]]
type = "stemmer"
algorithm = "porter2"

[[search.analyzers.medical.filters]]
type = "phonetic"
encoder = "double_metaphone"
```

### Elasticsearch-Compatible Index Settings

Custom analyzers can also be defined via the Elasticsearch-compatible API when creating an index:

```bash
curl -X PUT http://localhost:9200/medical-records \
  -H "Content-Type: application/json" \
  -d '{
    "settings": {
      "analysis": {
        "analyzer": {
          "medical_analyzer": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase", "medical_synonyms", "english_stemmer", "phonetic_dm"]
          }
        },
        "filter": {
          "medical_synonyms": {
            "type": "synonym",
            "synonyms": [
              "heart attack, myocardial infarction, MI",
              "high blood pressure, hypertension"
            ]
          },
          "english_stemmer": {
            "type": "stemmer",
            "language": "english"
          },
          "phonetic_dm": {
            "type": "phonetic",
            "encoder": "double_metaphone"
          }
        }
      }
    },
    "mappings": {
      "properties": {
        "diagnosis": {
          "type": "text",
          "analyzer": "medical_analyzer"
        },
        "patient_name": {
          "type": "text",
          "fields": {
            "phonetic": {
              "type": "text",
              "analyzer": "phonetic_dm"
            }
          }
        }
      }
    }
  }'
```

---

## Integration with SPARQL

Linguistic analysis integrates with the SPARQL full-text search extension. Use the `bds:search` magic predicate to invoke the configured analyzer for a field:

```sparql
PREFIX bds: <http://www.bigdata.com/rdf/search#>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

SELECT ?person ?name ?score WHERE {
    ?person foaf:name ?name .
    ?name bds:search "automobile safety" .
    ?name bds:relevance ?score .
    ?name bds:matchAllTerms true .
}
ORDER BY DESC(?score)
LIMIT 20
```

When synonym expansion is enabled on the analyzer bound to the `foaf:name` field, this query automatically expands "automobile" to include "car" and "vehicle".

---

## Performance Considerations

| Factor | Recommendation |
|--------|----------------|
| **Synonym dictionary size** | Keep under 50,000 rules for sub-millisecond expansion. Larger dictionaries still work but add latency at index time. |
| **Phonetic filters** | Add measurable overhead (~5-15% slower indexing). Use on dedicated sub-fields, not primary text fields. |
| **N-gram tokenizers** | Produce many more tokens than standard tokenizers. Set `max_gram` conservatively (8-10) to avoid index bloat. |
| **Stemmer choice** | Porter2 is the best default for English. Aggressive stemmers (Lancaster) may over-stem and reduce precision. |
| **Stop word removal** | Always enable in production to reduce index size by 20-30% for natural language text. |

!!! warning "Re-indexing Required After Analyzer Changes"
    Changing the analyzer configuration for an existing index requires re-indexing all documents in that index. The old tokens in the inverted index will not match the new analysis pipeline. Plan analyzer configuration carefully before initial data load.
