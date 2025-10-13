-- Keymaps are automatically loaded on the VeryLazy event
-- Default keymaps that are always set: https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/config/keymaps.lua
-- Add any additional keymaps here
local map = vim.keymap.set

-- Only apply this mapping on macOS
if vim.loop.os_uname().sysname == "Darwin" then
  -- In insert, visual, normal, and select modes, map 'ˆ' (Option+i) to your desired action
  map({ "i", "x", "n", "s" }, "ˆ", "<A-i>", { desc = "Alt+i (Option+i on macOS)" })
end

map({ "i", "x", "n", "s" }, "<leader>fw", "<cmd>w<cr><esc>", { desc = "Save File" })
