# Repository Guidelines

## Project Structure & Module Organization
- `init.lua` bootstraps LazyVim by loading `config.lazy`.
- `lua/config` groups runtime settings: `options.lua` (core options), `keymaps.lua`, `autocmds.lua`, and `lazy.lua` (plugin manager wiring).
- `lua/plugins` collects plugin specs by topic (`lspconfig.lua`, `flutter.lua`, themes, etc.); add new modules here and return a Lazy spec table.
- `lazyvim.json` tracks enabled LazyVim extras; adjust when opting into new bundles.
- `lazy-lock.json` captures resolved plugin commits; regenerate via Lazy after plugin changes.

## Build, Test, and Development Commands
- `nvim +":Lazy sync" +qa` installs or updates plugins in headless mode.
- `nvim +":Lazy check" +qa` reports pending plugin updates without applying them.
- `stylua .` formats all Lua files according to `stylua.toml`; run before committing.
- `nvim --headless -c "quit"` is a quick smoke test that the configuration parses cleanly.

## Coding Style & Naming Conventions
- Lua uses 2-space indentation, 120-column soft limit, and no trailing whitespace.
- Module filenames stay snake_case and mirror their concern (`lua/plugins/git.lua` → Git tooling).
- Group related keymaps and options under clear comment banners; prefix new plugin specs with a short summary in the returned table.

## Testing Guidelines
- After plugin edits, run `:Lazy sync` followed by `:Lazy log` inside Neovim to verify successful installs.
- Use `:checkhealth` to confirm dependencies; capture notable warnings in the PR description.
- Manual verification is expected (open a clean session with `NVIM_APPNAME=./ nvim` to isolate this config); document the scenarios you exercised.

## Commit & Pull Request Guidelines
- Follow the conventional style seen in history (`feat:`, `fix:`, `chore:`), keeping scopes optional but consistent.
- Include `lazy-lock.json` updates in the same commit as the spec change unless you intentionally defer upgrades.
- PRs should explain the motivation, list manual tests (`:Lazy sync`, `:checkhealth`, feature walkthroughs), and attach screenshots for UI or theme adjustments.
