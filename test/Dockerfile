FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
        curl git jq ca-certificates \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/pico-initializer
COPY js/ js/
COPY cli.js .

# Offline wheelhouse: per-combo venvs install from here so each generated
# project gets ONLY its declared dependencies. The pico-* constraints are
# GENERATED from js/versions.js (the single source of truth) — a hand-copied
# list here drifted and broke the smoke tests for two weeks.
RUN node --input-type=module -e 'const { PICO_VERSIONS } = await import("file:///opt/pico-initializer/js/versions.js"); console.log(Object.entries(PICO_VERSIONS).map(([n, v]) => (n === "pico-ioc" ? n + "[yaml]" + v : n + v)).join("\n"));' > /tmp/pico-requirements.txt \
 && pip download --no-cache-dir --dest /wheels \
    -r /tmp/pico-requirements.txt \
    "aiosqlite>=0.20.0" \
    "redis>=5.0" \
    "httpx" \
    "setuptools>=69.0" \
    "wheel"

RUN git config --global user.email "test@test.com" \
 && git config --global user.name "test"

COPY test/smoke.sh /opt/smoke.sh
RUN chmod +x /opt/smoke.sh

ENTRYPOINT ["/opt/smoke.sh"]
