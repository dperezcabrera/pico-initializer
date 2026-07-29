#!/usr/bin/env bash
set -euo pipefail

CLI="/opt/pico-initializer/cli.js"
WORK="/tmp/smoke"
MODULES=(fastapi sqlalchemy celery pydantic auth server-auth actuator resilience cache otel)
PASS=0
FAIL=0
ERRORS=""

combo_count=$((1 << ${#MODULES[@]}))

echo "=== pico-initializer smoke test ==="
echo "Testing $combo_count module combinations"
echo ""

# ── Phase 1: Generate + compile check (all combos) ──────────────────────────

echo "── Phase 1: generate + compile ──"
echo ""

for ((mask=0; mask<combo_count; mask++)); do
    selected=()
    label="base"
    for ((i=0; i<${#MODULES[@]}; i++)); do
        if (( mask & (1 << i) )); then
            selected+=("${MODULES[i]}")
        fi
    done

    if [ ${#selected[@]} -gt 0 ]; then
        label=$(IFS=+; echo "${selected[*]}")
    fi

    modules_json="[]"
    if [ ${#selected[@]} -gt 0 ]; then
        modules_json=$(printf '%s\n' "${selected[@]}" | jq -R . | jq -s .)
    fi

    config=$(jq -n \
        --arg name "test-${mask}" \
        --arg desc "Smoke test combo ${mask}" \
        --argjson modules "$modules_json" \
        '{
            projectName: $name,
            description: $desc,
            pythonVersion: "3.12",
            modules: $modules,
            includeDocker: true,
            includeTests: true
        }')

    dir="${WORK}/test-${mask}"
    rm -rf "$dir"
    printf "  [%2d/%-2d] %-50s " "$((mask+1))" "$combo_count" "$label"

    # Generate
    if ! node "$CLI" --output-dir "$dir" "$config" > /dev/null 2>&1; then
        echo "FAIL (generate)"
        FAIL=$((FAIL+1))
        ERRORS="${ERRORS}\n  ${label}: generation failed"
        continue
    fi

    # Compile check — validates all .py files are syntactically correct
    compile_out=$(python -m compileall -q "$dir" 2>&1) || true
    if [ -n "$compile_out" ]; then
        echo "FAIL (compile)"
        FAIL=$((FAIL+1))
        ERRORS="${ERRORS}\n  ${label}: compile error — ${compile_out}"
        continue
    fi

    echo "OK"
    PASS=$((PASS+1))
done

echo ""
echo "── Phase 1 results: ${PASS}/${combo_count} passed ──"
echo ""

# ── Phase 2: Runtime endpoint test (isolated venv, key combos) ───────────────

PHASE2_COMBOS=(
    '{"projectName":"rt-minimal","modules":[]}'
    '{"projectName":"rt-fastapi","modules":["fastapi"]}'
    '{"projectName":"rt-fastapi-sqla","modules":["fastapi","sqlalchemy"]}'
    '{"projectName":"rt-fastapi-auth","modules":["fastapi","auth"]}'
    '{"projectName":"rt-full","modules":["fastapi","sqlalchemy","celery","pydantic","auth"]}'
)

echo "── Phase 2: runtime endpoint test (${#PHASE2_COMBOS[@]} key combos) ──"
echo ""

P2_PASS=0
P2_FAIL=0

for raw_config in "${PHASE2_COMBOS[@]}"; do
    name=$(echo "$raw_config" | jq -r .projectName)
    mods=$(echo "$raw_config" | jq -r '.modules | join("+")')
    [ -z "$mods" ] && mods="base"

    full_config=$(echo "$raw_config" | jq '. + {
        pythonVersion: "3.12",
        description: "Runtime test",
        includeDocker: false,
        includeTests: false
    }')

    dir="${WORK}/runtime/${name}"
    rm -rf "$dir"
    printf "  %-50s " "${name} (${mods})"

    # Generate
    if ! node "$CLI" --output-dir "$dir" "$full_config" > /dev/null 2>&1; then
        echo "FAIL (generate)"
        P2_FAIL=$((P2_FAIL+1))
        ERRORS="${ERRORS}\n  runtime/${name}: generation failed"
        continue
    fi

    # Per-combo venv with ONLY the project's declared deps — mirrors a real
    # user environment. Installing into system site-packages (with every pico
    # module present) would leak unselected plugins via pico-boot
    # auto-discovery. Wheels come from the offline /wheels wheelhouse.
    python -m venv "$dir/.venv"
    install_out=$(cd "$dir" && .venv/bin/pip install -q --no-index --find-links=/wheels -e . httpx 2>&1) || true
    if echo "$install_out" | grep -qi "error"; then
        echo "FAIL (install)"
        P2_FAIL=$((P2_FAIL+1))
        ERRORS="${ERRORS}\n  runtime/${name}: install failed — $(echo "$install_out" | tail -3)"
        continue
    fi

    pkg=$(echo "$name" | tr '-' '_')
    has_fastapi=$(echo "$raw_config" | jq '.modules | index("fastapi") != null')

    if [ "$has_fastapi" = "true" ]; then
        result=$(cd "$dir" && .venv/bin/python -c "
from ${pkg}.main import create_app
from fastapi.testclient import TestClient
c = TestClient(create_app())
r = c.get('/api/example/smoke')
print(r.status_code)
" 2>/dev/null | tail -1) || true

        has_auth=$(echo "$raw_config" | jq '.modules | index("auth") != null')
        # With auth enabled, unprotected endpoints return 401 — that's correct behavior
        if [ "$result" = "200" ]; then
            echo "OK (endpoint 200)"
            P2_PASS=$((P2_PASS+1))
        elif [ "$result" = "401" ] && [ "$has_auth" = "true" ]; then
            echo "OK (endpoint 401 — auth active)"
            P2_PASS=$((P2_PASS+1))
        else
            echo "FAIL (endpoint)"
            P2_FAIL=$((P2_FAIL+1))
            ERRORS="${ERRORS}\n  runtime/${name}: endpoint — $(echo "$result" | tail -5)"
        fi
    else
        # Non-FastAPI: just check import works
        result=$(cd "$dir" && .venv/bin/python -c "from ${pkg}.services import ExampleService; print('ok')" 2>&1) || true
        if [ "$result" = "ok" ]; then
            echo "OK (import)"
            P2_PASS=$((P2_PASS+1))
        else
            echo "FAIL (import)"
            P2_FAIL=$((P2_FAIL+1))
            ERRORS="${ERRORS}\n  runtime/${name}: import — $(echo "$result" | tail -5)"
        fi
    fi
done

echo ""
echo "=== Final Results ==="
echo "  Phase 1 (compile):  ${PASS}/${combo_count}"
echo "  Phase 2 (runtime):  ${P2_PASS}/${#PHASE2_COMBOS[@]}"

TOTAL_FAIL=$((FAIL + P2_FAIL))

if [ -n "$ERRORS" ]; then
    echo ""
    echo "Failures:"
    echo -e "$ERRORS"
fi

echo ""
[ "$TOTAL_FAIL" -eq 0 ] && echo "ALL TESTS PASSED" && exit 0
echo "SOME TESTS FAILED" && exit 1
