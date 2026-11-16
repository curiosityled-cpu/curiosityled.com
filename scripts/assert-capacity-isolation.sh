#!/usr/bin/env bash
# Capacity isolation assertion for workstream D4.
#
# The allowance may only be consulted where a person enters a tenant. This
# script proves the negative: sign-in, check-ins, reviews, goals, exports and
# reports never reference the allowance or the gate.
#
# Run from anywhere:  bash scripts/assert-capacity-isolation.sh

set -euo pipefail
cd "$(dirname "$0")/.."

ALLOWED_GATE=(
  "base44/functions/inviteAppUser/entry.ts"
  "base44/functions/bulkInviteUsers/entry.ts"
  "base44/functions/createUserManually/entry.ts"
  "base44/functions/importStaffRoster/entry.ts"
)

ALLOWED_ALLOWANCE=(
  "base44/functions/getTenantAllowanceUsage/entry.ts"
)

fail=0

echo "== gate imports =="
while IFS= read -r file; do
  ok=0
  for allowed in "${ALLOWED_GATE[@]}"; do
    [[ "$file" == "$allowed" ]] && ok=1
  done
  if [[ $ok -eq 0 ]]; then
    echo "FAIL  $file imports the capacity gate but is not an add path"
    fail=1
  else
    echo "ok    $file"
  fi
done < <(grep -rl "capacityGate.ts" base44/functions | sort)

echo
echo "== allowance field reads outside reporting =="
while IFS= read -r file; do
  ok=0
  for allowed in "${ALLOWED_ALLOWANCE[@]}"; do
    [[ "$file" == "$allowed" ]] && ok=1
  done
  if [[ $ok -eq 0 ]]; then
    echo "FAIL  $file reads allowance fields outside the reporting function"
    fail=1
  else
    echo "ok    $file"
  fi
done < <(grep -rlE "manager_allowance|participant_allowance" base44/functions | sort)

echo
echo "== the working loop never mentions capacity =="
for pattern in "login" "checkin" "CheckIn" "review" "Review" "export" "Export" "report" "Report"; do
  hits=$(grep -rl "capacityGate\|manager_allowance\|participant_allowance" base44/functions | grep -i "$pattern" || true)
  if [[ -n "$hits" ]]; then
    echo "FAIL  capacity referenced in: $hits"
    fail=1
  fi
done
[[ $fail -eq 0 ]] && echo "ok    sign-in, check-ins, reviews, exports and reports are capacity-free"

echo
if [[ $fail -ne 0 ]]; then
  echo "RESULT: FAILED"
  exit 1
fi
echo "RESULT: PASSED"