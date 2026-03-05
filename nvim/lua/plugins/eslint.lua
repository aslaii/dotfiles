return {
  -- Add eslint_d for faster linting and formatting
  {
    "williamboman/mason.nvim",
    opts = function(_, opts)
      opts.ensure_installed = opts.ensure_installed or {}
      vim.list_extend(opts.ensure_installed, { "eslint_d" })
    end,
  },

  -- Configure ESLint LSP to respect project root and find local configs
  {
    "neovim/nvim-lspconfig",
    opts = {
      servers = {
        eslint = {
          settings = {
            workingDirectory = { mode = "location" },
          },
        },
      },
      setup = {
        eslint = function()
          -- Use the project-local eslint if available
          require("lazyvim.util").lsp.on_attach(function(client)
            if client.name == "eslint" then
              client.settings.workingDirectory = { mode = "location" }
            end
          end)
        end,
      },
    },
  },

  -- Configure Conform to prioritize project-level ESLint over global Prettier
  {
    "stevearc/conform.nvim",
    opts = function(_, opts)
      local utils = require("conform.utils")
      
      -- Function to check for project-level eslint config
      local function has_eslint_config(bufnr)
        return utils.root_file({
          ".eslintrc",
          ".eslintrc.js",
          ".eslintrc.json",
          ".eslintrc.yaml",
          ".eslintrc.yml",
          "eslint.config.js",
          "eslint.config.mjs",
          "eslint.config.cjs",
        })(vim.api.nvim_buf_get_name(bufnr))
      end

      opts.formatters_by_ft = opts.formatters_by_ft or {}
      
      local javascript_langs = { "javascript", "javascriptreact", "typescript", "typescriptreact" }
      
      for _, lang in ipairs(javascript_langs) do
        opts.formatters_by_ft[lang] = function(bufnr)
          if has_eslint_config(bufnr) then
            -- If project has eslint config, prioritize it
            return { "eslint_d", "prettier" }
          end
          -- Otherwise fall back to prettier
          return { "prettier" }
        end
      end
    end,
  },
}
