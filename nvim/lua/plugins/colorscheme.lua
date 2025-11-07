local function get_system_flavour()
  local override = vim.env.NVIM_THEME or vim.env.NVIM_FLAVOUR or vim.env.CATPPUCCIN_FLAVOUR
  if override then
    local normalized = override:lower()
    if normalized:find("latte", 1, true) or normalized:find("light", 1, true) then
      return "latte"
    end
    if normalized:find("mocha", 1, true) or normalized:find("dark", 1, true) then
      return "mocha"
    end
  end

  if vim.fn.has("macunix") == 1 then
    local output = vim.fn.system({ "defaults", "read", "-g", "AppleInterfaceStyle" })
    if vim.v.shell_error == 0 and output:match("Dark") then
      return "mocha"
    end
    return "latte"
  end

  if vim.fn.executable("gsettings") == 1 then
    local output = vim.fn.system({ "gsettings", "get", "org.gnome.desktop.interface", "color-scheme" })
    if vim.v.shell_error == 0 then
      local value = output:lower()
      if value:match("dark") then
        return "mocha"
      end
      if value:match("light") or value:match("default") then
        return "latte"
      end
    end
  end

  if vim.o.background == "light" then
    return "latte"
  end

  return "mocha"
end

local function apply_catppuccin(opts, flavour)
  opts.flavour = flavour
  require("catppuccin").setup(opts)
  vim.o.background = flavour == "latte" and "light" or "dark"
  vim.cmd.colorscheme("catppuccin")
end

return {
  "catppuccin/nvim",
  lazy = false,
  name = "catppuccin",
  priority = 1000,

  opts = function()
    local flavour = get_system_flavour()

    return {
      flavour = flavour,
      float = {
        transparent = false,
        solid = true,
      },
      integrations = {
        aerial = true,
        alpha = true,
        cmp = true,
        dashboard = true,
        flash = true,
        gitsigns = true,
        illuminate = true,
        indent_blankline = { enabled = true },
        lsp_trouble = true,
        mason = true,
        markdown = true,
        mini = true,
        native_lsp = {
          enabled = true,
          underlines = {
            errors = { "undercurl" },
            hints = { "undercurl" },
            warnings = { "undercurl" },
            information = { "undercurl" },
          },
        },
        neotree = true,
        noice = true,
        notify = true,
        semantic_tokens = true,
        telescope = true,
        treesitter = true,
      },
    }
  end,

  config = function(_, opts)
    apply_catppuccin(opts, opts.flavour)

    vim.api.nvim_create_autocmd("FocusGained", {
      pattern = "*",
      callback = function()
        local new_flavour = get_system_flavour()

        if new_flavour ~= opts.flavour then
          apply_catppuccin(opts, new_flavour)
        end
      end,
    })
  end,
}
