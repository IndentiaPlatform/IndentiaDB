# Stage 1: Build MkDocs static site
FROM nexus.lvm.local:8082/python:3.12-slim AS builder

WORKDIR /docs

COPY requirements-docs.txt .
RUN pip install --no-cache-dir -r requirements-docs.txt

COPY . .
RUN mkdocs build --strict

# Stage 2: Serve with nginx (unprivileged, OKD-compatible)
FROM nexus.lvm.local:8082/nginxinc/nginx-unprivileged:alpine

COPY --from=builder /docs/site /usr/share/nginx/html

# Custom nginx config — port 8080 (unprivileged default)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
