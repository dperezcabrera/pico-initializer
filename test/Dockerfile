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
# project gets ONLY its declared dependencies (constraints mirror js/versions.js)
RUN pip download --no-cache-dir --dest /wheels \
    "pico-ioc[yaml]>=2.4.0,<3.0" \
    "pico-boot~=0.1.2" \
    "pico-fastapi~=0.3.0" \
    "pico-sqlalchemy~=0.4.0" \
    "pico-celery~=0.2.2" \
    "pico-pydantic~=0.2.2" \
    "pico-agent~=0.2.0" \
    "pico-client-auth~=0.4.2" \
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
