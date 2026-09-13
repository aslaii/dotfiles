# Command Code provider setup

Command Code (Command Code GOAT) serves DeepSeek V4.1 Flash over an OpenAI-compatible
endpoint. OMO Native and OMP load it as a custom provider. The API key stays in the
macOS Keychain, so no key is written into a config file.

Model ID in both clients:

```text
commandcode/deepseek/deepseek-v4.1-flash
```

## 1. Store the API key

Run this once on each machine:

```bash
security add-generic-password -U -a "$USER" -s commandcode-api-key -w
```

`-w` with no value makes `security` prompt for the key, so the key does not land in
the shell history. `-U` updates the entry when it already exists.

OMP reads the key at request time with this command:

```bash
security find-generic-password -w -s commandcode-api-key
```

OMO Native authenticates through OMO's own credential store instead (`/login` or
`omo auth`, kept in `~/.omo/agent/auth.json`); the pinned provider package reads it
from there, so the Keychain entry is only needed for OMP.

Linux has no `security` command. Replace the read command in the OMP provider block with
the local secret tool, or start the client with the key in the environment.

## 2. Add the DeepSeek V4.1 thinking override to OMO Native

OMO Native gets the provider itself from the pinned `npm:pi-commandcode-provider`
package listed in `agent/settings.json`. That package derives model metadata from
its own generated catalog, which still marks `deepseek/deepseek-v4.1-flash` as
non-reasoning, so OMO would register no thinking levels for it: `:low`/`:high`/
`:max` selectors fail fallback-chain validation and any selected level is clamped
back to `off`.

The tracked override in `omo/agent/models.json`, restored to
`~/.omo/agent/models.json`, patches that registration. It is the topmost
user-config layer and applies after the package registers its models:

```json
{
  "providers": {
    "commandcode": {
      "modelOverrides": {
        "deepseek/deepseek-v4.1-flash": {
          "reasoning": true,
          "thinkingLevelMapMode": "replace",
          "thinkingLevelMap": {
            "off": null,
            "minimal": null,
            "low": "low",
            "medium": null,
            "high": "high",
            "xhigh": null,
            "max": "max"
          },
          "compat": {
            "supportsReasoningEffort": true,
            "thinkingFormat": "deepseek"
          }
        }
      }
    }
  }
}
```

That yields the supported levels `low`, `high`, `max`; `thinkingFormat` `deepseek`
sends `thinking: {"type": "enabled"}` plus the mapped `reasoning_effort`, and OMO's
fallback validation accepts those selectors.

**This override is temporary.** Delete the `modelOverrides` entry (and the file if it
holds nothing else) once `pi-commandcode-provider` ships a generated catalog that
lists `deepseek/deepseek-v4.1-flash` in its reasoning models and effort map — the
condition is a provider sync to Command Code CLI `>= 1.53.0`. Restore backs up and
replaces any hand-kept `~/.omo/agent/models.json`, so keep provider tuning in the
tracked file.

## 3. Add the provider to OMP

File: `~/.omp/agent/models.yml`

```yaml
providers:
  commandcode:
    baseUrl: https://api.commandcode.ai/provider/v1
    api: openai-completions
    apiKey: "!security find-generic-password -w -s commandcode-api-key"
    authHeader: true
    compat:
      supportsDeveloperRole: false
      supportsReasoningEffort: true
      thinkingFormat: openai
      disableReasoningOnToolChoice: true
    discovery:
      type: openai-models-list
      injectV1: false
    modelOverrides:
      deepseek/deepseek-v4.1-flash:
        reasoning: true
        input: [text, image]
        contextWindow: 1000000
        maxTokens: 65536
        thinking:
          mode: effort
          efforts: [low, medium, high, xhigh, max]
```

OMP discovers the full Command Code plan catalog live via `discovery` (an
`openai-models-list` call against the provider's `/models` endpoint) instead
of a static `models:` list. `modelOverrides` only patches the entries OMP
needs richer metadata for (thinking efforts, context window, image input);
every other discovered model, including `meta/muse-spark-1.3-contributor`,
is used with its discovered defaults.

OMP accepts only `openai` for `thinkingFormat` and rejects `deepseek`. Start OMP
once and it creates `models.yml` when the file is absent.

ZDR (zero data retention) is opt-in on Command Code, not required: a
request that omits the ZDR header still returns 200 with a valid
completion, and most models route through ZDR-capable upstreams by
default anyway. Forcing that header restricts routing to ZDR-capable
upstreams and caps the model's usable allowance at the plan's default
tier (for example $20 on GOAT, instead of the $40-$60 boosted allowance a
model normally gets), so the tracked config omits it.

## 4. Verify

```bash
omo --list-models commandcode
omp models find commandcode
```

Both print one row:

```text
provider     model                         context  max-out  thinking  images
commandcode  deepseek/deepseek-v4.1-flash  1M       384K     yes       yes
```

A missing Keychain entry gives an empty list or an auth error. Re-run step 1 and
check that the service name is exactly `commandcode-api-key`.

## 5. Route models through it

Registration alone adds no routing. The fallback order lives in three places:

| Client | File | Keys |
| --- | --- | --- |
| OMO Native | `~/.omo/omo.jsonc` | `categories`, `agents`, and the profiles `fast`, `gpt`, `gpt-5.6`, `claude`, `mixed` |
| OMO session | `~/.omo/agent/settings.json` | `favoriteModels`, `enabledModels`, `recommendedModels`, `retry.fallbackChains` |
| OMP | `~/.omp/agent/config.yml` | `modelRoles`, `retry.fallbackChains` |
| OMP budget overlay | `omp/budget.yml` (tracked; `--config` overlay for `omp-budget`) | `modelRoles`, `retry.fallbackChains` |

`~/.omo/agent/models-store.json` is a provider catalog cache. Do not edit it.

OMO loads `commandcode/deepseek/deepseek-v4.1-flash` through the pinned
`pi-commandcode-provider` package, whose generated catalog still marks that model
non-reasoning. The tracked `agent/models.json` override (step 2) restores
`reasoning`, the `low`/`high`/`max` effort map, and the `deepseek` thinking
format, so every OMO DeepSeek V4.1 chain entry carries `high` and OMO's
fallback-chain validation accepts it. Drop that override once the provider syncs
to Command Code CLI `>= 1.53.0`. OMP declares its own efforts in
`omp/agent/models.yml`, so the OMP `:max` lanes above remain valid.

The default order used in `~/.omp/agent/config.yml`:

1. Claude first, because company policy says to use it.
2. `commandcode/deepseek/deepseek-v4.1-flash` next. Heavy lanes (`deep`,
   `ultrabrain`, `plan-reviewer`, `oracle`) run it at `max`.
3. Free Muse Spark as the zero-cost backstop.
4. GPT last, and only while the Codex account is up.

`omp/budget.yml` replaces that order entirely with a plan-only stack: the
Command Code DeepSeek tier for reasoning roles, the plan-hosted Muse Spark
1.3 Contributor (`commandcode/meta/muse-spark-1.3-contributor`, the plan's
cheapest capable model) for grunt lanes, and the free, rate-limited
OpenCode Zen Muse Contributor endpoint only as a last-resort backstop. No
role or fallback edge in that overlay reaches Claude, GPT, or a paid Zen
model.

The tracked copies of the routing files are `omo/omo.jsonc`, `omo/agent/settings.json`,
`omp/agent/config.yml`, and `omp/agent/models.yml`. They restore on a new machine. The
OMO provider block above (step 2) is a runtime file and is not tracked; copy it by hand
or repeat step 2. The OMP provider block (step 3) is tracked in `omp/agent/models.yml`
and restores with the other OMP files.
