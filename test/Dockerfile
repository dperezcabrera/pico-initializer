FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
        curl git jq ca-certificates \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/pico-initializer
COPY js/ js/
COPY cli.js .

# Pre-install every possible dependency so per-combo installs are instant
RUN pip install --no-cache-dir \
    "pico-ioc[yaml]>=2.2.0" \
    "pico-boot>=0.1.0" \
    "pico-fastapi>=0.1.0" \
    "pico-sqlalchemy>=0.1.0" \
    "pico-celery>=0.1.0" \
    "pico-pydantic>=0.1.0" \
    "pico-agent>=0.1.0" \
    "pico-client-auth>=0.1.0" \
    "aiosqlite>=0.20.0" \
    "uvicorn" \
    "redis" \
    "httpx" \
    "setuptools>=69.0" \
    "setuptools-scm>=8.0" \
    "wheel"

RUN git config --global user.email "test@test.com" \
 && git config --global user.name "test"

COPY test/smoke.sh /opt/smoke.sh
RUN chmod +x /opt/smoke.sh

ENTRYPOINT ["/opt/smoke.sh"]
