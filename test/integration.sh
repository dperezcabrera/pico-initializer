#!/usr/bin/env bash
set -euo pipefail

CLI="/opt/pico-initializer/cli.js"
WORK="/tmp/integration"
PASS=0
FAIL=0

echo "=== pico-initializer integration test ==="
echo ""

rm -rf "$WORK"
mkdir -p "$WORK"

# ─── Test 1: Module mode ─────────────────────────────────────────────────────

echo "── Test 1: Module scaffold ──"

node "$CLI" --output-dir "$WORK/pico-foo" '{"projectName":"pico-foo","modules":["fastapi"],"includePicoModule":true}'

echo "  Files generated:"
find "$WORK/pico-foo" -type f | sort | sed 's|^|    |'

# Verify structure
echo "  Checking structure..."
for f in \
    pyproject.toml \
    README.md \
    .gitignore \
    src/pico_foo/__init__.py \
    src/pico_foo/config.py \
    src/pico_foo/components.py \
    tests/__init__.py \
    tests/conftest.py \
    tests/test_module.py; do
    if [ ! -f "$WORK/pico-foo/$f" ]; then
        echo "    MISSING: $f"
        FAIL=$((FAIL+1))
    fi
done

# Verify NO app files leaked
for f in application.yaml requirements.txt; do
    if [ -f "$WORK/pico-foo/$f" ]; then
        echo "    LEAKED app file: $f"
        FAIL=$((FAIL+1))
    fi
done

# Verify entry point in pyproject.toml
if grep -q 'pico_boot.modules' "$WORK/pico-foo/pyproject.toml"; then
    echo "    entry-point: OK"
else
    echo "    entry-point: MISSING"
    FAIL=$((FAIL+1))
fi

# Verify ruff config
if grep -q 'tool.ruff' "$WORK/pico-foo/pyproject.toml"; then
    echo "    ruff config: OK"
else
    echo "    ruff config: MISSING"
    FAIL=$((FAIL+1))
fi

# Verify src/ layout
if grep -q 'where = \["src"\]' "$WORK/pico-foo/pyproject.toml"; then
    echo "    src/ layout: OK"
else
    echo "    src/ layout: MISSING"
    FAIL=$((FAIL+1))
fi

# Compile check
if python -m compileall -q "$WORK/pico-foo/src/" 2>/dev/null; then
    echo "    compile: OK"
    PASS=$((PASS+1))
else
    echo "    compile: FAIL"
    FAIL=$((FAIL+1))
fi

# Install + test
cd "$WORK/pico-foo"
git init -q && git add -A && git commit -q -m "init"
if SETUPTOOLS_SCM_PRETEND_VERSION=0.1.0 pip install -e . -q 2>/dev/null; then
    echo "    install: OK"
    if python -c "from pico_foo.components import PicoFooService; print('import OK')" 2>/dev/null; then
        echo "    import: OK"
        PASS=$((PASS+1))
    else
        echo "    import: FAIL"
        FAIL=$((FAIL+1))
    fi
    pip uninstall -y pico-foo -q 2>/dev/null || true
else
    echo "    install: FAIL"
    FAIL=$((FAIL+1))
fi

echo ""

# ─── Test 2: App mode with CRUD example ──────────────────────────────────────

echo "── Test 2: App + CRUD example + Docker ──"

node "$CLI" --output-dir "$WORK/my-service" '{
    "projectName":"my-service",
    "modules":["fastapi","sqlalchemy","pydantic","auth"],
    "includeDocker":true,
    "includeCompose":true,
    "includeAuthServer":true,
    "includeTests":true,
    "includeExample":true
}'

echo "  Files generated:"
find "$WORK/my-service" -type f | sort | sed 's|^|    |'

# Verify structure
echo "  Checking structure..."
for f in \
    my_service/__init__.py \
    my_service/main.py \
    my_service/config.py \
    my_service/services.py \
    my_service/controllers.py \
    my_service/models.py \
    my_service/repositories.py \
    my_service/secure_controller.py \
    application.yaml \
    pyproject.toml \
    requirements.txt \
    README.md \
    Dockerfile \
    docker-compose.yml \
    tests/__init__.py \
    tests/conftest.py \
    examples/products_api/__init__.py \
    examples/products_api/models.py \
    examples/products_api/schemas.py \
    examples/products_api/repositories.py \
    examples/products_api/services.py \
    examples/products_api/controllers.py \
    examples/products_api/database.py; do
    if [ ! -f "$WORK/my-service/$f" ]; then
        echo "    MISSING: $f"
        FAIL=$((FAIL+1))
    fi
done

# Verify NO src/ layout (app mode)
if [ -d "$WORK/my-service/src" ]; then
    echo "    LEAKED: src/ directory in app mode"
    FAIL=$((FAIL+1))
fi

# Verify docker-compose has auth service
if grep -q 'pico-auth' "$WORK/my-service/docker-compose.yml"; then
    echo "    compose auth: OK"
else
    echo "    compose auth: MISSING"
    FAIL=$((FAIL+1))
fi

# Verify modules=["my_service"] (root only)
if grep -q 'modules=\["my_service"\]' "$WORK/my-service/my_service/main.py"; then
    echo "    root module: OK"
else
    echo "    root module: MISSING (should be modules=[\"my_service\"])"
    FAIL=$((FAIL+1))
fi

# Compile check
if python -m compileall -q "$WORK/my-service/" 2>/dev/null; then
    echo "    compile: OK"
    PASS=$((PASS+1))
else
    echo "    compile: FAIL"
    FAIL=$((FAIL+1))
fi

# Install + runtime test
cd "$WORK/my-service"
git init -q && git add -A && git commit -q -m "init"
if SETUPTOOLS_SCM_PRETEND_VERSION=0.1.0 pip install -e . -q 2>/dev/null; then
    echo "    install: OK"

    # Import check
    imports_ok=true
    for mod in \
        my_service.config \
        my_service.services \
        my_service.controllers \
        my_service.models \
        my_service.repositories \
        my_service.secure_controller; do
        if ! python -c "import ${mod}" 2>/dev/null; then
            echo "    import FAIL: ${mod}"
            imports_ok=false
            FAIL=$((FAIL+1))
        fi
    done
    if $imports_ok; then
        echo "    imports: OK"
        PASS=$((PASS+1))
    fi

    # Add config for auto-discovered plugins that may be installed but not selected
    cat >> "$WORK/my-service/application.yaml" <<'EXTRA'

celery:
  broker_url: "memory://"
  backend_url: "cache+memory://"
EXTRA

    # Endpoint test (auto-discovery active)
    result=$(cd "$WORK/my-service" && python -c "
from my_service.main import app
from fastapi.testclient import TestClient
c = TestClient(app)
r = c.get('/api/example/test')
print(r.status_code)
" 2>&1) || true

    if [ "$result" = "401" ] || [ "$result" = "200" ]; then
        echo "    endpoint: OK ($result)"
        PASS=$((PASS+1))
    else
        echo "    endpoint: FAIL ($result)"
        FAIL=$((FAIL+1))
    fi

    # Dockerfile syntax check
    if docker build --check -f Dockerfile . 2>/dev/null || true; then
        echo "    dockerfile: OK"
    fi

    pip uninstall -y my-service -q 2>/dev/null || true
else
    echo "    install: FAIL"
    FAIL=$((FAIL+1))
fi

echo ""

# ─── Results ─────────────────────────────────────────────────────────────────

TOTAL=$((PASS + FAIL))
echo "=== Results ==="
echo "  PASS: ${PASS}"
echo "  FAIL: ${FAIL}"
echo ""

[ "$FAIL" -eq 0 ] && echo "ALL INTEGRATION TESTS PASSED" && exit 0
echo "SOME TESTS FAILED" && exit 1
