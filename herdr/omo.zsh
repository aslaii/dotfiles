omo() {
  if [[ ${HERDR_ENV:-} == 1 ]]; then
    HERDR_AGENT=pi command omo "$@"
  else
    command omo "$@"
  fi
}
