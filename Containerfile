# Stage 1: Build MkDocs static site
FROM nexus.lvm.local:8082/python:3.12-slim AS builder

WORKDIR /docs

COPY requirements-docs.txt .
RUN pip install --no-cache-dir -r requirements-docs.txt

COPY . .
RUN mkdocs build --strict

# Stage 2: Serve with nginx
FROM nexus.lvm.local:8082/nginx:alpine

COPY --from=builder /docs/site /usr/share/nginx/html

# Custom nginx config for clean URLs
RUN printf 'server {\n\
    listen 80;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    location / {\n\
        try_files $uri $uri/ $uri.html /index.html;\n\
    }\n\
    location ~* \\.(css|js|png|jpg|svg|ico|woff2?)$ {\n\
        expires 1y;\n\
        add_header Cache-Control "public, immutable";\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80
