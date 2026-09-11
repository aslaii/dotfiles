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

Both configs read the key at request time with this command:

```bash
security find-generic-password -w -s commandcode-api-key
```

Linux has no `security` command. Replace the read command in the provider block with
the local secret tool, or start the client with the key in the environment.

## 2. Add the provider to OMO Native

File: `~/.omo/agent/models.json`

Add this key inside the existing `providers` object:

```json
{
  "commandcode": {
    "baseUrl": "https://api.commandcode.ai/provider/v1",
    "api": "openai-completions",
    "apiKey": "!security find-generic-password -w -s commandcode-api-key",
    "authHeader": true,
    "headers": { "x-cmd-zdr": "1" },
    "compat": {
      "supportsDeveloperRole": false,
      "supportsReasoningEffort": true,
      "thinkingFormat": "deepseek",
      "disableReasoningOnToolChoice": true
    },
    "models": [
      {
        "id": "deepseek/deepseek-v4.1-flash",
        "name": "DeepSeek V4.1 Flash via Command Code",
        "reasoning": true,
        "input": ["text", "image"],
        "contextWindow": 1000000,
        "maxTokens": 384000,
        "thinkingLevelMap": {
          "off": null,
          "minimal": null,
          "low": "low",
          "medium": null,
          "high": "high",
          "xhigh": null,
          "max": "max"
        }
      }
    ]
  }
}
```

`thinkingFormat` is `deepseek` here. OMO accepts that value.

## 3. Add the provider to OMP

File: `~/.omp/agent/models.yml`

```yaml
providers:
  commandcode:
    baseUrl: https://api.commandcode.ai/provider/v1
    api: openai-completions
    apiKey: "!security find-generic-password -w -s commandcode-api-key"
    authHeader: true
    headers:
      x-cmd-zdr: "1"
    compat:
      supportsDeveloperRole: false
      supportsReasoningEffort: true
      thinkingFormat: openai
      disableReasoningOnToolChoice: true
    models:
      - id: deepseek/deepseek-v4.1-flash
        name: DeepSeek V4.1 Flash via Command Code
        reasoning: true
        input: [text, image]
        contextWindow: 1000000
        maxTokens: 384000
        thinkingLevelMap:
          off: null
          minimal: null
          low: low
          medium: null
          high: high
          xhigh: null
          max: max
```

OMP accepts only `openai` for `thinkingFormat` and rejects `deepseek`. Start OMP
once and it creates `models.yml` when the file is absent.

The `x-cmd-zdr: "1"` header asks for the zero-data-retention route. Command Code
rejects the request instead of sending code over a non-ZDR route. Keep the header.

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
| OMO Native | `~/.omo/omo.jsonc` | `categories`, `agents`, and the four profiles `fast`, `gpt`, `claude`, `mixed` |
| OMO session | `~/.omo/agent/settings.json` | `favoriteModels`, `enabledModels`, `recommendedModels`, `retry.fallbackChains` |
| OMP | `~/.omp/agent/config.yml` | `modelRoles`, `retry.fallbackChains` |

`~/.omo/agent/models-store.json` is a provider catalog cache. Do not edit it.

The order used here:

1. Claude first, because company policy says to use it.
2. `commandcode/deepseek/deepseek-v4.1-flash` next. Heavy lanes (`deep`,
   `ultrabrain`, `plan-reviewer`, `oracle`) run it at `max`.
3. Free Muse Spark as the zero-cost backstop.
4. GPT last, and only while the Codex account is up.

The tracked copies of the routing files are `omo/omo.jsonc`, `omo/agent/settings.json`,
and `omp/agent/config.yml`. They restore on a new machine. The provider blocks above
are runtime files and are not tracked. Copy them by hand or repeat steps 1 to 3.
