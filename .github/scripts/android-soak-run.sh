#!/usr/bin/env bash
# Runs the maestro-runner devicelab Android flows against the booted
# emulator, with a 3x failed-flow retry. Invoked as a SINGLE line from
# android-soak.yml's reactivecircus script: step, because that action
# executes its `script:` input line-by-line under /usr/bin/sh — which
# breaks multi-line constructs (for/if/cd/variables). Calling one bash
# file sidesteps that entirely.
#
# Expects env: APP_ID, APP_SCHEME, GITHUB_WORKSPACE, and maestro-runner
# on PATH (+ MAESTRO_RUNNER_HOME).
set -uo pipefail

# Metro (started on the host) reaches the emulator via reverse.
adb reverse tcp:8081 tcp:8081
adb install -r "$GITHUB_WORKSPACE/android-build/android-debug.apk"
adb logcat > "$HOME/mr-logcat.log" 2>&1 &

cd "$GITHUB_WORKSPACE/example"
FLOWS=""
for f in $(ls e2e/maestro/*.yml | xargs -n1 basename | sort); do
  FLOWS="$FLOWS e2e/maestro/$f"
done

set -x
maestro-runner \
  --driver devicelab \
  --platform android \
  test --output /tmp/mr-report --flatten \
  -e APP_ID="$APP_ID" \
  -e APP_SCHEME="$APP_SCHEME" \
  $FLOWS
EXIT=$?
set +x

REPORT=/tmp/mr-report/report.json
for attempt in 1 2 3; do
  if [ "$EXIT" -eq 0 ]; then break; fi
  if [ ! -f "$REPORT" ]; then
    echo "::warning::No report.json after attempt $attempt — skipping flow retry."
    break
  fi
  FAILED_FLOWS=$(jq -r '.flows[] | select(.status == "failed") | .sourceFile' "$REPORT" 2>/dev/null | xargs -n1 basename | tr '\n' ' ')
  if [ -z "$FAILED_FLOWS" ]; then
    echo "::warning::Exit $EXIT but no flow-level failures found — skipping flow retry."
    break
  fi
  echo "::group::Retry #$attempt — re-running: $FAILED_FLOWS"
  RETRY_FLOWS=""
  for f in $FAILED_FLOWS; do RETRY_FLOWS="$RETRY_FLOWS e2e/maestro/$f"; done
  set -x
  maestro-runner \
    --driver devicelab \
    --platform android \
    test --output "/tmp/mr-report-retry-$attempt" --flatten \
    -e APP_ID="$APP_ID" \
    -e APP_SCHEME="$APP_SCHEME" \
    $RETRY_FLOWS
  RETRY_EXIT=$?
  set +x
  echo "::endgroup::"
  if [ "$RETRY_EXIT" -eq 0 ]; then
    echo "::notice::Retry #$attempt cleared all failed flows."
    EXIT=0
    break
  fi
  REPORT="/tmp/mr-report-retry-$attempt/report.json"
done
exit $EXIT
