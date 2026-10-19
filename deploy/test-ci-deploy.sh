#!/usr/bin/env bash
set -Eeuo pipefail

root_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
tmp_dir=$(mktemp -d)
trap 'rm -rf "$tmp_dir"' EXIT
mock_bin="$tmp_dir/bin"
mkdir -p "$mock_bin"

cat > "$mock_bin/ssh" <<'MOCK_SSH'
#!/usr/bin/env bash
set -Eeuo pipefail

while (($#)); do
  case "$1" in
    -n|-T)
      shift
      ;;
    -p|-i|-o)
      shift 2
      ;;
    *)
      remote=$1
      shift
      command=${1:-}
      break
      ;;
  esac
done

printf '%s\n' "$command" >> "$MOCK_COMMAND_LOG"

if [[ "$command" == *'docker login ghcr.io'* ]]; then
  token=''
  IFS= read -r token || true
  [[ "$token" == 'fake-ghcr-token' ]]
  exit
fi

if [[ "$command" == *'if docker inspect budang-web'* ]]; then
  if [[ -n "${MOCK_PREVIOUS_IMAGE:-}" ]]; then
    printf '%s' "$MOCK_PREVIOUS_IMAGE"
  fi
  exit 0
fi

if [[ "$command" == *"docker inspect --format '{{.State.Health.Status}}'"* ]]; then
  if [[ "$MOCK_SCENARIO" == 'first-health-failure' || \
        ( ( "$MOCK_SCENARIO" == 'health-failure' || "$MOCK_SCENARIO" == 'rollback-failure' ) && \
          ! -f "$MOCK_STATE_DIR/rollback" ) ]]; then
    printf 'unhealthy'
  else
    printf 'healthy'
  fi
  exit 0
fi

if [[ "$command" == *'docker compose'* && "$command" == *' up -d '* ]]; then
  image=''
  if [[ "$command" =~ IMAGE=([^[:space:]]+)[[:space:]]+docker[[:space:]]+compose ]]; then
    image=${BASH_REMATCH[1]}
  fi

  if [[ "$MOCK_SCENARIO" == 'up-failure' && "$image" == "$MOCK_NEW_IMAGE" ]]; then
    exit 42
  fi
  if [[ "$MOCK_SCENARIO" == 'rollback-failure' && "$image" == "$MOCK_PREVIOUS_IMAGE" ]]; then
    exit 43
  fi
  if [[ -n "${MOCK_PREVIOUS_IMAGE:-}" && "$image" == "$MOCK_PREVIOUS_IMAGE" ]]; then
    touch "$MOCK_STATE_DIR/rollback"
  fi
  exit 0
fi

if [[ "$command" == *'docker compose'* && "$command" == *'rm --stop --force app'* ]]; then
  touch "$MOCK_STATE_DIR/first-deploy-container-removed"
  exit 0
fi

exit 0
MOCK_SSH

cat > "$mock_bin/scp" <<'MOCK_SCP'
#!/usr/bin/env bash
set -Eeuo pipefail
printf '%s\n' "$*" >> "$MOCK_COMMAND_LOG"
MOCK_SCP

cat > "$mock_bin/sleep" <<'MOCK_SLEEP'
#!/usr/bin/env bash
exit 0
MOCK_SLEEP

chmod +x "$mock_bin/ssh" "$mock_bin/scp" "$mock_bin/sleep"

new_image="ghcr.io/acme/video-web:$(printf 'a%.0s' {1..40})-12345-1"
old_image='ghcr.io/acme/video-web:previous-100-1'

run_scenario() {
  local scenario=$1
  local previous_image=$2
  local state_dir="$tmp_dir/$scenario"
  local command_log="$state_dir/commands.log"
  local output_log="$state_dir/output.log"
  local status=0
  mkdir -p "$state_dir"
  : > "$command_log"

  if env \
    PATH="$mock_bin:$PATH" \
    MOCK_SCENARIO="$scenario" \
    MOCK_STATE_DIR="$state_dir" \
    MOCK_COMMAND_LOG="$command_log" \
    MOCK_PREVIOUS_IMAGE="$previous_image" \
    MOCK_NEW_IMAGE="$new_image" \
    RUNNER_TEMP="$state_dir" \
    DEPLOY_HOST=example.com \
    DEPLOY_PORT=22 \
    DEPLOY_USER=deployer \
    DEPLOY_PATH=/opt/video-web \
    DEPLOY_SSH_PRIVATE_KEY=fake-private-key \
    DEPLOY_KNOWN_HOSTS='example.com ssh-ed25519 fake-host-key' \
    GHCR_USER='github-actions[bot]' \
    GHCR_TOKEN=fake-ghcr-token \
    IMAGE="$new_image" \
    bash "$root_dir/deploy/ci-deploy.sh" > "$output_log" 2>&1; then
    status=0
  else
    status=$?
  fi

  printf '%s\n' "$status" "$state_dir" "$command_log" "$output_log"
}

assert_contains() {
  local file=$1
  local expected=$2
  if ! grep -Fq -- "$expected" "$file"; then
    echo "Expected '$expected' in $file" >&2
    cat "$file" >&2
    exit 1
  fi
}

success_result=$(run_scenario success "$old_image")
success_status=$(printf '%s\n' "$success_result" | sed -n '1p')
success_commands=$(printf '%s\n' "$success_result" | sed -n '3p')
success_output=$(printf '%s\n' "$success_result" | sed -n '4p')
if [[ "$success_status" != '0' ]]; then
  cat "$success_output" >&2
  exit 1
fi
assert_contains "$success_commands" 'StrictHostKeyChecking=yes'
assert_contains "$success_commands" '--no-deps --force-recreate app'
assert_contains "$success_commands" 'docker logout ghcr.io'

up_failure_result=$(run_scenario up-failure "$old_image")
up_failure_status=$(printf '%s\n' "$up_failure_result" | sed -n '1p')
up_failure_state=$(printf '%s\n' "$up_failure_result" | sed -n '2p')
up_failure_output=$(printf '%s\n' "$up_failure_result" | sed -n '4p')
[[ "$up_failure_status" != '0' ]]
[[ -f "$up_failure_state/rollback" ]]
assert_contains "$up_failure_output" 'Previous image is healthy again.'

health_failure_result=$(run_scenario health-failure "$old_image")
health_failure_status=$(printf '%s\n' "$health_failure_result" | sed -n '1p')
health_failure_state=$(printf '%s\n' "$health_failure_result" | sed -n '2p')
health_failure_output=$(printf '%s\n' "$health_failure_result" | sed -n '4p')
[[ "$health_failure_status" != '0' ]]
[[ -f "$health_failure_state/rollback" ]]
assert_contains "$health_failure_output" 'Previous image is healthy again.'

rollback_failure_result=$(run_scenario rollback-failure "$old_image")
rollback_failure_status=$(printf '%s\n' "$rollback_failure_result" | sed -n '1p')
rollback_failure_output=$(printf '%s\n' "$rollback_failure_result" | sed -n '4p')
[[ "$rollback_failure_status" != '0' ]]
assert_contains "$rollback_failure_output" 'ERROR: rollback command failed; inspect the service on the deployment host.'

first_failure_result=$(run_scenario first-health-failure '')
first_failure_status=$(printf '%s\n' "$first_failure_result" | sed -n '1p')
first_failure_state=$(printf '%s\n' "$first_failure_result" | sed -n '2p')
first_failure_output=$(printf '%s\n' "$first_failure_result" | sed -n '4p')
[[ "$first_failure_status" != '0' ]]
[[ -f "$first_failure_state/first-deploy-container-removed" ]]
assert_contains "$first_failure_output" 'First deployment failed; removing only the new app container.'

invalid_dir="$tmp_dir/invalid"
mkdir -p "$invalid_dir"
invalid_log="$invalid_dir/commands.log"
: > "$invalid_log"
if env \
  PATH="$mock_bin:$PATH" \
  MOCK_SCENARIO=invalid \
  MOCK_STATE_DIR="$invalid_dir" \
  MOCK_COMMAND_LOG="$invalid_log" \
  RUNNER_TEMP="$invalid_dir" \
  DEPLOY_HOST=example.com \
  DEPLOY_PORT=22 \
  DEPLOY_USER=deployer \
  DEPLOY_PATH='/opt/app;id' \
  DEPLOY_SSH_PRIVATE_KEY=fake-private-key \
  DEPLOY_KNOWN_HOSTS='example.com ssh-ed25519 fake-host-key' \
  GHCR_USER='github-actions[bot]' \
  GHCR_TOKEN=fake-ghcr-token \
  IMAGE="$new_image" \
  bash "$root_dir/deploy/ci-deploy.sh" > "$invalid_dir/output.log" 2>&1; then
  echo 'Unsafe DEPLOY_PATH should be rejected.' >&2
  exit 1
fi
[[ ! -s "$invalid_log" ]]

echo 'Deployment contract tests passed.'
