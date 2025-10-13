return {
  "catppuccin/nvim",
  lazy = false,
  name = "catppuccin",
  priority = 1000,

  opts = function()
    vim.env.TZ = "Asia/Manila"
    local hour = tonumber(os.date("%H"))
    local current_flavour = (hour >= 6 and hour < 18) and "latte" or "mocha"

    return {
      flavour = current_flavour,
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
    require("catppuccin").setup(opts)
    vim.cmd.colorscheme("catppuccin")

    vim.api.nvim_create_autocmd("FocusGained", {
      pattern = "*",
      callback = function()
        vim.env.TZ = "Asia/Manila"
        local hour = tonumber(os.date("%H"))
        local new_flavor = (hour >= 6 and hour < 18) and "latte" or "mocha"

        if vim.g.catppuccin_flavour ~= new_flavor then
          require("catppuccin").setup({
            flavour = new_flavor,
            float = { transparent = false, solid = true },
          })
          vim.cmd.colorscheme("catppuccin")
        end
      end,
    })
  end,
}
