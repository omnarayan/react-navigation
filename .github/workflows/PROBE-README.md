# Probe workflows

Two manual-only workflows that mirror upstream's `E2E / iOS` job but skip
the slow `xcodebuild` step (~10 min) by downloading a pre-built debug
`.app` from a release on this fork.

| Workflow | Tool | Trigger |
|---|---|---|
| `e2e-ios-probe-maestro.yml` | upstream `maestro` 2.2.0 (matches CI baseline) | manual only |
| `e2e-ios-probe-maestro-runner.yml` | `maestro-runner` (choice of `wda` or `devicelab` driver) | manual only |

## Inputs

- `flows`: space-separated list of flow filenames (relative to `example/e2e/maestro/`). Default = 4 representative flows.
- `release_tag`: GitHub Release tag holding `ReactNavigationExample.app.tar.gz`. Default `probe-app-v1`.
- `driver` (maestro-runner only): `wda` or `devicelab`.
- `maestro_runner_version` (maestro-runner only): version to download from `open.devicelab.dev`. Default `1.1.15`.

## One-time setup

Before running, attach the pre-built debug `.app` as a release artifact:

```bash
# Build (or grab from local DerivedData)
APP=/path/to/DerivedData/.../Debug-iphonesimulator/ReactNavigationExample.app
tar -czf /tmp/app.tar.gz -C $(dirname "$APP") $(basename "$APP")

gh release create probe-app-v1 /tmp/app.tar.gz \
  --notes "Pre-built debug app for E2E probe workflows" \
  --repo omnarayan/react-navigation
```

After that, each probe run takes ~4-6 min instead of ~20 min.

## Running

GitHub UI → Actions tab → pick `Probe E2E iOS — Maestro` or
`Probe E2E iOS — maestro-runner` → "Run workflow" → fill inputs → "Run".

Or CLI:

```bash
gh workflow run "Probe E2E iOS — Maestro" --repo omnarayan/react-navigation
gh workflow run "Probe E2E iOS — maestro-runner" --repo omnarayan/react-navigation \
  -f driver=devicelab
```
