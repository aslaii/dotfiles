#!/usr/bin/env bash
# Regression checks for the explicit macOS / Linux-WSL bootstraps.
#
# Runnable:  bash tests/bootstrap-check.sh
# Guarantees: no package installs, no network, no mutation outside mktemp dirs.
#   Every case runs with an isolated HOME, a scrubbed XDG_* environment, and
#   a stub PATH whose sudo/apt/brew/curl/gh fail loudly if check mode ever
#   tries to install anything.
#
# Exit 0 when every check passes, 1 otherwise.
set -euo pipefail

# Every mktemp dir the suite owns is registered here and removed on EXIT,
# so an unexpected failure can never leak isolated HOME/stub dirs.
OWNED_DIRS=()
cleanup_owned() {
  if ((${#OWNED_DIRS[@]})); then
    rm -rf -- "${OWNED_DIRS[@]}"
  fi
}
trap cleanup_owned EXIT

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MACOS_SCRIPT="$REPO/initial-setup-macos.sh"
LINUX_SCRIPT="$REPO/initial-setup-linux.sh"
DISPATCH_SCRIPT="$REPO/initial-setup.sh"
PASS=0
FAIL=0

pass() { PASS=$((PASS + 1)); printf 'PASS: %s\n' "$1"; }
fail() { FAIL=$((FAIL + 1)); printf 'FAIL: %s\n' "$1"; }

# make_iso_home <varname-home> <varname-stubdir>
# Creates an isolated HOME plus a stub bin dir with poisoned install tools.
make_iso_home() {
  local _iso _stub
  _iso="$(mktemp -d)"
  _stub="$(mktemp -d)"
  for tool in sudo apt apt-get brew curl wget gh; do
    printf '#!/usr/bin/env bash\necho "STUB-CALLED: %s $*" >&2\nexit 99\n' "$tool" >"$_stub/$tool"
    chmod +x "$_stub/$tool"
  done
  printf -v "$1" '%s' "$_iso"
  printf -v "$2" '%s' "$_stub"
  OWNED_DIRS+=("$_iso" "$_stub")
}

# run_check <script> <home> <stub> [extra env...] -- captures output/rc
# Runs a bootstrap in check mode with scrubbed XDG_* and stub PATH.
run_check() {
  local script="$1" home="$2" stub="$3"
  shift 3
  env -i \
    HOME="$home" \
    DOTFILES_DIR="$REPO" \
    TMPDIR="${TMPDIR:-/tmp}" \
    PATH="$stub:/usr/bin:/bin" \
    "$@" \
    bash "$script" --check
}

# --- 1. shell syntax -------------------------------------------------------
for script in "$DISPATCH_SCRIPT" "$MACOS_SCRIPT" "$LINUX_SCRIPT"; do
  if [[ ! -f "$script" ]]; then
    fail "syntax: $script exists"
  elif bash -n "$script"; then
    pass "syntax: $(basename "$script") parses"
  else
    fail "syntax: $(basename "$script") parses"
  fi
done

# --- 2. shellcheck (when available) ----------------------------------------
if command -v shellcheck >/dev/null 2>&1; then
  for script in "$DISPATCH_SCRIPT" "$MACOS_SCRIPT" "$LINUX_SCRIPT"; do
    if [[ -f "$script" ]] && shellcheck -S warning "$script"; then
      pass "shellcheck: $(basename "$script") clean"
    else
      fail "shellcheck: $(basename "$script") clean"
    fi
  done
else
  printf 'SKIP: shellcheck not installed\n'
fi

# --- 3+4. macOS check mode (Darwin) or macOS guard (elsewhere) -------------
if [[ "$(uname -s)" == "Darwin" ]]; then
  iso=""; stub=""
  make_iso_home iso stub
  rc=0
  out="$(run_check "$MACOS_SCRIPT" "$iso" "$stub" 2>&1)" || rc=$?
  if [[ $rc -ne 0 ]] && [[ "$out" == *"MISSING:"* ]]; then
    pass "macos --check reports drift on empty HOME"
  else
    fail "macos --check reports drift on empty HOME (rc=$rc)"
  fi
  if [[ -z "$(ls -A "$iso")" ]]; then
    pass "macos --check creates nothing under HOME"
  else
    fail "macos --check creates nothing under HOME"
  fi
  if [[ "$out" != *"STUB-CALLED"* ]]; then
    pass "macos --check calls no installer (apt/brew/curl/sudo)"
  else
    fail "macos --check calls no installer (apt/brew/curl/sudo)"
  fi
  rm -rf "$iso" "$stub"

  make_iso_home iso stub
  mkdir -p "$iso/.codex" "$iso/Library/Application Support/com.mitchellh.ghostty" "$iso/.config"
  ln -s "$REPO/macos/zsh/zshrc" "$iso/.zshrc"
  ln -s "$REPO/macos/zsh/zsh" "$iso/.zsh"
  ln -s "$REPO/tmux/tmux.conf" "$iso/.tmux.conf"
  ln -s "$REPO/codex/AGENTS.md" "$iso/AGENTS.md"
  ln -s "$REPO/codex/AGENTS.md" "$iso/.codex/AGENTS.md"
  ln -s "$REPO/codex/hooks.json" "$iso/.codex/hooks.json"
  ln -s "$REPO/ghostty/config" "$iso/Library/Application Support/com.mitchellh.ghostty/config"
  ln -s "$REPO/codex" "$iso/.config/codex"
  ln -s "$REPO/nvim" "$iso/.config/nvim"
  rc=0
  out="$(run_check "$MACOS_SCRIPT" "$iso" "$stub" 2>&1)" || rc=$?
  if [[ $rc -eq 0 ]] && [[ "$out" == *"All 9 symlinks OK"* ]]; then
    pass "macos --check green on fully linked HOME"
  else
    fail "macos --check green on fully linked HOME (rc=$rc)"
  fi
  rm -rf "$iso" "$stub"
else
  # On Linux the macOS entrypoint must refuse instead of installing.
  iso=""; stub=""
  make_iso_home iso stub
  rc=0
  out="$(run_check "$MACOS_SCRIPT" "$iso" "$stub" 2>&1)" || rc=$?
  if [[ $rc -ne 0 ]] && [[ "$out" == *"intended for macOS only"* ]]; then
    pass "macos bootstrap refuses to run on Linux"
  else
    fail "macos bootstrap refuses to run on Linux (rc=$rc)"
  fi
  if [[ -z "$(ls -A "$iso")" && "$out" != *"STUB-CALLED"* ]]; then
    pass "macos refusal is side-effect free on Linux"
  else
    fail "macos refusal is side-effect free on Linux"
  fi
  # macOS link-green-path is covered on Darwin above; on Linux the refusal
  # cases are the whole contract.
  rm -rf "$iso" "$stub"
fi

# --- 5. Linux script exists, is executable, has safe check mode ------------
if [[ -x "$LINUX_SCRIPT" ]]; then
  pass "linux bootstrap exists and is executable"
else
  fail "linux bootstrap exists and is executable"
fi

if [[ -f "$LINUX_SCRIPT" ]]; then
  make_iso_home iso stub
  # Linux check mode must also run on this host (darwin) for isolated testing.
  rc=0
  out="$(run_check "$LINUX_SCRIPT" "$iso" "$stub" 2>&1)" || rc=$?
  if [[ $rc -ne 0 ]] && [[ "$out" == *"MISSING:"* ]]; then
    pass "linux --check reports drift on empty HOME"
  else
    fail "linux --check reports drift on empty HOME (rc=$rc)"
  fi
  if [[ -z "$(ls -A "$iso")" ]]; then
    pass "linux --check creates nothing under HOME"
  else
    fail "linux --check creates nothing under HOME"
  fi
  if [[ "$out" != *"STUB-CALLED"* ]]; then
    pass "linux --check calls no installer (apt/sudo/curl)"
  else
    fail "linux --check calls no installer (apt/sudo/curl)"
  fi
  rm -rf "$iso" "$stub"
else
  fail "linux --check reports drift on empty HOME (script missing)"
  fail "linux --check creates nothing under HOME (script missing)"
  fail "linux --check calls no installer (apt/sudo/curl) (script missing)"
fi

# --- 6. Linux --check green with WSL sources -------------------------------
if [[ -f "$LINUX_SCRIPT" ]]; then
  make_iso_home iso stub
  mkdir -p "$iso/.codex" "$iso/.config/ghostty"
  ln -s "$REPO/wsl/zsh/zshrc" "$iso/.zshrc"
  ln -s "$REPO/wsl/zsh/zsh" "$iso/.zsh"
  ln -s "$REPO/wsl/tmux.conf" "$iso/.tmux.conf"
  ln -s "$REPO/codex/AGENTS.md" "$iso/AGENTS.md"
  ln -s "$REPO/codex/AGENTS.md" "$iso/.codex/AGENTS.md"
  ln -s "$REPO/codex/hooks.json" "$iso/.codex/hooks.json"
  ln -s "$REPO/ghostty/config" "$iso/.config/ghostty/config"
  ln -s "$REPO/codex" "$iso/.config/codex"
  ln -s "$REPO/nvim" "$iso/.config/nvim"
  rc=0
  out="$(run_check "$LINUX_SCRIPT" "$iso" "$stub" 2>&1)" || rc=$?
  if [[ $rc -eq 0 ]] && [[ "$out" == *"symlinks OK"* ]]; then
    pass "linux --check green on fully linked HOME (wsl sources)"
  else
    fail "linux --check green on fully linked HOME (wsl sources) (rc=$rc)"
  fi
  rm -rf "$iso" "$stub"
else
  fail "linux --check green on fully linked HOME (wsl sources) (script missing)"
fi

# --- 7. link_file behavior: create, preserve, repair, rerun ---------------
# Valid symlinks, regular files, and directories are left exactly as they
# are; only a broken (dangling) symlink is replaced so the expected link
# lands. Sourced in a subshell, so no bootstrap main runs and nothing is
# installed or downloaded.
if [[ -f "$LINUX_SCRIPT" ]]; then
  make_iso_home iso stub
  # shellcheck disable=SC1090
  (
    HOME="$iso" DOTFILES_DIR="$REPO" PATH="$stub:/usr/bin:/bin"
    export HOME DOTFILES_DIR PATH
    source "$LINUX_SCRIPT"
    case_fail() { printf 'CASE-FAIL: %s\n' "$1" >&2; exit 1; }

    # Creates a missing link pointing at the expected source.
    link_file "$REPO/wsl/zsh/zshrc" "$iso/.zshrc" >/dev/null 2>&1
    [[ -L "$iso/.zshrc" && "$(readlink "$iso/.zshrc")" == "$REPO/wsl/zsh/zshrc" ]] \
      || case_fail "creates missing link"

    # Rerun over a valid link is a no-op.
    link_file "$REPO/wsl/zsh/zshrc" "$iso/.zshrc" >/dev/null 2>&1
    [[ -L "$iso/.zshrc" && "$(readlink "$iso/.zshrc")" == "$REPO/wsl/zsh/zshrc" ]] \
      || case_fail "idempotent rerun"

    # An existing regular file keeps its bytes and stays a regular file.
    echo "user content" >"$iso/.tmux.conf"
    link_file "$REPO/wsl/tmux.conf" "$iso/.tmux.conf" >/dev/null 2>&1
    [[ -f "$iso/.tmux.conf" && ! -L "$iso/.tmux.conf" && "$(cat "$iso/.tmux.conf")" == "user content" ]] \
      || case_fail "preserves regular file"

    # An existing directory (with contents) is kept as-is.
    mkdir -p "$iso/.zsh/custom"
    echo "keep" >"$iso/.zsh/custom/keep.txt"
    link_file "$REPO/wsl/zsh/zsh" "$iso/.zsh" >/dev/null 2>&1
    [[ -d "$iso/.zsh" && ! -L "$iso/.zsh" && "$(cat "$iso/.zsh/custom/keep.txt")" == "keep" ]] \
      || case_fail "preserves directory"

    # A valid symlink pointing elsewhere is kept (not repointed).
    mkdir -p "$iso/other"
    echo "mine" >"$iso/other/zshrc"
    ln -s "$iso/other/zshrc" "$iso/.codexrc"
    link_file "$REPO/wsl/zsh/zshrc" "$iso/.codexrc" >/dev/null 2>&1
    [[ -L "$iso/.codexrc" && "$(readlink "$iso/.codexrc")" == "$iso/other/zshrc" ]] \
      || case_fail "preserves different valid symlink"

    # A broken (dangling) symlink is replaced by the expected link.
    ln -s "$iso/does-not-exist" "$iso/.broken"
    link_file "$REPO/wsl/zsh/zshrc" "$iso/.broken" >/dev/null 2>&1
    [[ -L "$iso/.broken" && "$(readlink "$iso/.broken")" == "$REPO/wsl/zsh/zshrc" ]] \
      || case_fail "replaces broken symlink"
  ) && pass "linux link_file: create, preserve, repair, idempotent" \
    || fail "linux link_file: create, preserve, repair, idempotent"
  rm -rf "$iso" "$stub"
else
  fail "linux link_file: create, preserve, repair, idempotent (script missing)"
fi

# --- 8. dispatcher behavior: identical to the platform check ---------------
# Routing is proven by output+exit equality with the platform entrypoint for
# this host (same isolated HOME, same stubs), not by matching script text.
if [[ -f "$DISPATCH_SCRIPT" ]]; then
  if [[ "$(uname -s)" == "Darwin" ]]; then
    plat="$MACOS_SCRIPT"
  else
    plat="$LINUX_SCRIPT"
  fi
  make_iso_home iso stub
  rc=0
  out="$(run_check "$DISPATCH_SCRIPT" "$iso" "$stub" 2>&1)" || rc=$?
  rc_plat=0
  out_plat="$(run_check "$plat" "$iso" "$stub" 2>&1)" || rc_plat=$?
  if [[ "$out" == "$out_plat" && "$rc" -eq "$rc_plat" ]]; then
    pass "dispatcher --check matches platform check on $(uname -s)"
  else
    fail "dispatcher --check matches platform check on $(uname -s) (rc=$rc plat_rc=$rc_plat)"
  fi
  if [[ -z "$(ls -A "$iso")" && "$out" != *"STUB-CALLED"* ]]; then
    pass "dispatcher --check is side-effect free"
  else
    fail "dispatcher --check is side-effect free"
  fi
  rm -rf "$iso" "$stub"
else
  fail "dispatcher --check matches platform check (script missing)"
  fail "dispatcher --check is side-effect free (script missing)"
fi

# --- 9. check mode detects (not destroys) drifted regular files ------------
if [[ -f "$LINUX_SCRIPT" ]]; then
  make_iso_home iso stub
  echo "precious" >"$iso/.zshrc"
  rc=0
  out="$(run_check "$LINUX_SCRIPT" "$iso" "$stub" 2>&1)" || rc=$?
  if [[ $rc -ne 0 ]] && [[ "$out" == *"WRONG: $iso/.zshrc is not a symlink"* ]] && [[ "$(cat "$iso/.zshrc")" == "precious" ]]; then
    pass "linux --check flags regular files without touching them"
  else
    fail "linux --check flags regular files without touching them (rc=$rc)"
  fi
  rm -rf "$iso" "$stub"
else
  fail "linux --check flags regular files without touching them (script missing)"
fi

printf '\nbootstrap-check: %d passed, %d failed\n' "$PASS" "$FAIL"
[[ $FAIL -eq 0 ]]
