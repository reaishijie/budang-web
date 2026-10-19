#!/usr/bin/env bash
set -Eeuo pipefail

required_variables=(
  DEPLOY_HOST
  DEPLOY_PORT
  DEPLOY_USER
  DEPLOY_PATH
  DEPLOY_SSH_PRIVATE_KEY
  DEPLOY_KNOWN_HOSTS
  GHCR_USER
  GHCR_TOKEN
  IMAGE
  RUNNER_TEMP
)

for variable in "${required_variables[@]}"; do
  if [[ -z "${!variable:-}" ]]; then
    echo "Missing required deployment variable: ${variable}" >&2
    exit 1
  fi
done

if [[ ! "$DEPLOY_HOST" =~ ^[A-Za-z0-9][A-Za-z0-9.-]*$ ]]; then
  echo 'DEPLOY_HOST must be a hostname or IPv4 address' >&2
  exit 1
fi

if [[ ! "$DEPLOY_PORT" =~ ^[0-9]{1,5}$ ]]; then
  echo 'DEPLOY_PORT must be an integer between 1 and 65535' >&2
  exit 1
fi
port_number=$((10#$DEPLOY_PORT))
if ((port_number < 1 || port_number > 65535)); then
  echo 'DEPLOY_PORT must be an integer between 1 and 65535' >&2
  exit 1
fi

if [[ ! "$DEPLOY_USER" =~ ^[A-Za-z_][A-Za-z0-9_-]*$ ]]; then
  echo 'DEPLOY_USER contains unsupported characters' >&2
  exit 1
fi

if [[ ! "$DEPLOY_PATH" =~ ^/[A-Za-z0-9._/-]+$ ]] || \
  [[ "$DEPLOY_PATH" == '/' || "$DEPLOY_PATH" == */ || "$DEPLOY_PATH" == *//* || \
    "$DEPLOY_PATH" == *'/../'* || "$DEPLOY_PATH" == */.. || \
    "$DEPLOY_PATH" == *'/./'* || "$DEPLOY_PATH" == */. ]]; then
  echo 'DEPLOY_PATH must be a normalized absolute path without shell metacharacters' >&2
  exit 1
fi

if [[ ! "$GHCR_USER" =~ ^[A-Za-z0-9._-]+(\[[A-Za-z0-9._-]+\])?$ ]]; then
  echo 'GHCR_USER contains unsupported characters' >&2
  exit 1
fi

if [[ ! "$IMAGE" =~ ^ghcr\.io/[a-z0-9._-]+/[a-z0-9._-]+:[0-9a-f]{40}-[0-9]+-[0-9]+$ ]]; then
  echo 'IMAGE must be a GHCR image tagged with commit SHA, run ID, and run attempt' >&2
  exit 1
fi

image_name=${IMAGE%:*}
remote="${DEPLOY_USER}@${DEPLOY_HOST}"
key_file=''
known_hosts_file=''
previous_image=''
update_attempted=false
deployment_succeeded=false
registry_login_attempted=false

ssh_remote() {
  ssh -n -T "${ssh_options[@]}" "$remote" "$1"
}

wait_for_healthy() {
  local health=''
  local attempt

  # Docker health checks run every 30 seconds; allow startup plus retries.
  for ((attempt = 1; attempt <= 60; attempt++)); do
    if ! health="$(ssh_remote "docker inspect --format '{{.State.Health.Status}}' video-web 2>/dev/null || true")"; then
      return 1
    fi

    if [[ "$health" == 'healthy' ]]; then
      return 0
    fi
    if [[ "$health" == 'unhealthy' ]]; then
      return 1
    fi
    sleep 2
  done

  return 1
}

rollback_deployment() {
  local rollback_image
  local rollback_image_q

  if [[ -n "$previous_image" ]]; then
    rollback_image=$previous_image
    rollback_image_q=$(printf '%q' "$rollback_image")
    echo "Restoring previous image: $rollback_image" >&2

    if ! ssh_remote \
      "cd -- $deploy_path_q && IMAGE=$rollback_image_q docker compose --env-file .env.production -f compose.prod.yml up -d --no-deps --force-recreate app"; then
      echo 'ERROR: rollback command failed; inspect the service on the deployment host.' >&2
      return 1
    fi

    if ! wait_for_healthy; then
      echo 'ERROR: previous image did not become healthy after rollback.' >&2
      return 1
    fi

    echo 'Previous image is healthy again.' >&2
    return 0
  fi

  echo 'First deployment failed; removing only the new app container.' >&2
  if ! ssh_remote \
    "cd -- $deploy_path_q && IMAGE=$image_q docker compose --env-file .env.production -f compose.prod.yml rm --stop --force app"; then
    echo 'ERROR: could not remove the failed first-deployment app container.' >&2
    return 1
  fi
}

cleanup() {
  local exit_code=$?
  trap - EXIT
  set +e

  if [[ "$update_attempted" == true && "$deployment_succeeded" != true ]]; then
    if ! rollback_deployment; then
      exit_code=1
    fi
  fi

  if [[ "$registry_login_attempted" == true ]]; then
    if ! ssh -n -T "${ssh_options[@]}" "$remote" 'docker logout ghcr.io >/dev/null 2>&1'; then
      echo 'WARNING: unable to remove the temporary GHCR login from the deployment host.' >&2
      if ((exit_code == 0)); then
        exit_code=1
      fi
    fi
  fi

  if [[ -n "$key_file" ]]; then
    rm -f -- "$key_file"
  fi
  if [[ -n "$known_hosts_file" ]]; then
    rm -f -- "$known_hosts_file"
  fi

  exit "$exit_code"
}

trap cleanup EXIT
umask 077
key_file=$(mktemp "$RUNNER_TEMP/video-web-key.XXXXXX")
known_hosts_file=$(mktemp "$RUNNER_TEMP/video-web-known-hosts.XXXXXX")
printf '%s\n' "$DEPLOY_SSH_PRIVATE_KEY" > "$key_file"
printf '%s\n' "$DEPLOY_KNOWN_HOSTS" > "$known_hosts_file"
chmod 600 "$key_file" "$known_hosts_file"

ssh_options=(
  -p "$DEPLOY_PORT"
  -i "$key_file"
  -o BatchMode=yes
  -o IdentitiesOnly=yes
  -o StrictHostKeyChecking=yes
  -o "UserKnownHostsFile=$known_hosts_file"
  -o ConnectTimeout=15
)
scp_options=(
  -P "$DEPLOY_PORT"
  -i "$key_file"
  -o BatchMode=yes
  -o IdentitiesOnly=yes
  -o StrictHostKeyChecking=yes
  -o "UserKnownHostsFile=$known_hosts_file"
  -o ConnectTimeout=15
)

deploy_path_q=$(printf '%q' "$DEPLOY_PATH")
image_q=$(printf '%q' "$IMAGE")
ghcr_user_q=$(printf '%q' "$GHCR_USER")

# Verify the Docker daemon and server-side runtime config before changing files or services.
ssh_remote \
  "docker info >/dev/null && mkdir -p -- $deploy_path_q && test -r $deploy_path_q/.env.production"

scp "${scp_options[@]}" compose.prod.yml "$remote:$DEPLOY_PATH/compose.prod.yml"

previous_image=$(ssh_remote \
  "if docker inspect video-web >/dev/null 2>&1; then docker inspect --format '{{.Config.Image}}' video-web; fi")
if [[ -n "$previous_image" ]]; then
  previous_tag=${previous_image#"$image_name:"}
  if [[ "$previous_image" != "$image_name:"* || ! "$previous_tag" =~ ^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$ ]]; then
    echo 'Existing container image is not a recognized image from this GHCR repository; refusing automatic rollback.' >&2
    exit 1
  fi
fi

registry_login_attempted=true
printf '%s' "$GHCR_TOKEN" | ssh -T "${ssh_options[@]}" "$remote" \
  "docker login ghcr.io --username $ghcr_user_q --password-stdin"

ssh_remote \
  "cd -- $deploy_path_q && IMAGE=$image_q docker compose --env-file .env.production -f compose.prod.yml pull app"

# Set this before up: SSH can fail after the remote Compose command has already changed the service.
update_attempted=true
ssh_remote \
  "cd -- $deploy_path_q && IMAGE=$image_q docker compose --env-file .env.production -f compose.prod.yml up -d --no-deps --force-recreate app"

if ! wait_for_healthy; then
  echo 'The new container did not become healthy; automatic rollback will be attempted.' >&2
  exit 1
fi

deployment_succeeded=true
echo "Deployed $IMAGE"
