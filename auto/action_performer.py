# /Users/jerichobermas/auto/action_performer.py
import random
import time
from controllers.mouse_controller import random_mouse_movement, random_scroll
from controllers.keyboard_controller import (
    random_neovim_command,
    ensure_modifier_keys_released,
    reset_browser_state,
    simulate_ctrl_tab
)
from controllers.desktop_controller import switch_desktop
from utils.logger import log_message
from activity_manager import ActivityManager


class ActionPerformer:
    """Performs various automation actions based on activity settings."""

    def __init__(self):
        self.activity_manager = ActivityManager()
        self.current_desktop = 1

    def switch_desktop(self, desktop_number):
        """Switch to the specified desktop."""
        ensure_modifier_keys_released()
        switch_desktop(desktop_number)
        ensure_modifier_keys_released()
        self.current_desktop = desktop_number

    def perform_action(self, action_type, activity_level):
        """Perform the specified action based on the current activity level and desktop."""
        if self.current_desktop == 1:  # Browser desktop
            if action_type == "mouse_movement":
                self._perform_mouse_movements(activity_level)
            elif action_type == "keyboard_typing":
                self._perform_browser_typing()
            elif action_type == "tab_switching":
                self._perform_tab_switching()
            elif action_type == "scrolling":
                self._perform_random_scroll()
            elif action_type == "desktop_switching":
                self.switch_desktop(2)
        else:  # Desktop 2 - Neovim desktop
            if action_type == "mouse_movement":
                self._perform_mouse_movements(activity_level)
            elif action_type == "keyboard_typing":
                self._perform_neovim_command()
            elif action_type == "tab_switching":
                self._perform_mouse_movements(activity_level)
            elif action_type == "desktop_switching":
                self.switch_desktop(1)

    def _perform_mouse_movements(self, activity_level):
        """Perform a series of mouse movements."""
        movements = self.activity_manager.calculate_repetitions(
            4, activity_level)
        for _ in range(movements):
            ensure_modifier_keys_released()
            random_mouse_movement()
            time.sleep(self.activity_manager.get_pause_time("short"))

    def _perform_browser_typing(self):
        """Perform keyboard typing (single key) or CTRL+TAB for browser."""
        ensure_modifier_keys_released()
        simulate_ctrl_tab()
        time.sleep(self.activity_manager.get_pause_time("short"))

    def _perform_neovim_command(self):
        """Perform a Neovim command."""
        ensure_modifier_keys_released()
        random_neovim_command()

    def _perform_tab_switching(self):
        """Switch tabs using CTRL+TAB."""
        simulate_ctrl_tab()

    def _perform_random_scroll(self):
        """Perform a random scrolling action."""
        ensure_modifier_keys_released()
        random_scroll()
        time.sleep(self.activity_manager.get_pause_time("short"))

    def perform_browser_actions(self, activity_level=None):
        """Perform a sequence of browser-related actions."""
        if activity_level is None:
            activity_level = self.activity_manager.get_current_activity_level()

        repetitions = self.activity_manager.calculate_repetitions(
            5, activity_level)
        for i in range(repetitions):
            reset_browser_state()
            ensure_modifier_keys_released()
            random_mouse_movement()
            time.sleep(self.activity_manager.get_pause_time("short"))

            ensure_modifier_keys_released()
            time.sleep(self.activity_manager.get_pause_time("short"))
            ensure_modifier_keys_released()
            simulate_ctrl_tab()

            if random.random() < 0.5:
                self._perform_random_scroll()

            if i < repetitions - 1:
                time.sleep(self.activity_manager.get_pause_time("medium"))
                if random.random() < 0.7:  # 70% chance to switch tabs
                    simulate_ctrl_tab()
                    time.sleep(self.activity_manager.get_pause_time("short"))

    def perform_neovim_actions(self, activity_level=None):
        """Perform a fast sequence of Neovim commands on Desktop 2."""
        if activity_level is None:
            activity_level = self.activity_manager.get_current_activity_level()

        min_commands = random.randint(20, 30)
        repetitions = max(
            self.activity_manager.calculate_repetitions(4, activity_level),
            min_commands
        )
        log_message(f"Performing {repetitions} Neovim commands...")

        mouse_movements = self.activity_manager.calculate_repetitions(
            2, activity_level)
        for _ in range(mouse_movements):
            random_mouse_movement()
            time.sleep(0.05)

        for i in range(repetitions):
            random_neovim_command()
            pause = min(self.activity_manager.get_pause_time("short"), 0.1)
            if i < repetitions - 1:
                time.sleep(pause)
        log_message("Finished Neovim actions sequence.")

    def perform_complex_sequence(self, activity_level=None):
        """Perform a complex sequence of actions across desktops."""
        if activity_level is None:
            activity_level = self.activity_manager.get_current_activity_level()

        # Browser actions on desktop 1:
        self.switch_desktop(1)

        mouse_movements = self.activity_manager.calculate_repetitions(
            6, activity_level)
        for _ in range(mouse_movements):
            random_mouse_movement()
            time.sleep(self.activity_manager.get_pause_time("short"))

        self.perform_browser_actions(activity_level)

        # Switch to desktop 2 for Neovim actions:
        self.switch_desktop(2)
        self.perform_neovim_actions(activity_level)
