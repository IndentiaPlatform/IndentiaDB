# Contributing to IndentiaDB

Thank you for your interest in contributing to IndentiaDB. This guide covers the process for reporting issues, submitting changes, and the standards we follow.

---

## Reporting Issues

Open an issue on the repository's issue tracker. Include the following information:

- **IndentiaDB version** (output of `indentiadb --version`)
- **Operating system and architecture**
- **Steps to reproduce** the problem
- **Expected behavior** vs. **actual behavior**
- **Relevant logs or error messages** (set `LOG_LEVEL=debug` for detailed output)

For security vulnerabilities, do not open a public issue. Instead, email security@indentia.nl with a description of the vulnerability.

---

## Development Setup

### Prerequisites

- **Rust 1.75 or later** -- install via [rustup](https://rustup.rs/)
- **SurrealDB** -- a running instance for integration tests
- **Git** -- for version control

### Building

```bash
git clone <repository-url>
cd indentiadb
cargo build
```

### Running Tests

```bash
# Unit tests
cargo test

# Integration tests (requires a running SurrealDB instance)
cargo test --features integration

# All tests with output
cargo test -- --nocapture
```

### Running Locally

```bash
cargo run -- --config indentiadb.toml
```

---

## Code Style

All code must pass formatting and linting checks before merge.

### Formatting

We use `rustfmt` with the project's `rustfmt.toml` configuration:

```bash
cargo fmt --all
```

### Linting

We use `clippy` with warnings treated as errors:

```bash
cargo clippy --all-targets --all-features -- -D warnings
```

### General Guidelines

- Write clear, descriptive variable and function names.
- Add doc comments (`///`) to all public types and functions.
- Keep functions focused -- prefer small functions with a single responsibility.
- Write unit tests for new functionality.
- Avoid `unwrap()` in library code; use proper error handling with `Result`.

---

## Pull Request Process

1. **Fork the repository** and create a feature branch from `main`:
   ```bash
   git checkout -b feature/my-change main
   ```

2. **Make your changes** in small, focused commits. Write clear commit messages that explain the "why" behind the change.

3. **Run checks locally** before pushing:
   ```bash
   cargo fmt --all --check
   cargo clippy --all-targets --all-features -- -D warnings
   cargo test
   ```

4. **Push your branch** and open a pull request against `main`.

5. **Describe your changes** in the PR description:
   - What problem does this solve?
   - How was it tested?
   - Are there any breaking changes?

6. **Address review feedback** by adding new commits (do not force-push during review).

7. Once approved, a maintainer will merge the PR.

---

## License Agreement

By contributing to IndentiaDB, you agree that your contributions will be licensed under the [Apache License 2.0](LICENSE), the same license that covers the project.

You represent that you have the right to submit the contribution and that it does not violate any third-party rights.
