# /Users/jerichobermas/auto/action_performer.py
import random
import time
from controllers.mouse_controller import random_mouse_movement
from controllers.keyboard_controller import (
    random_keystroke, 
    random_programming_word, 
    random_neovim_command, 
    ensure_modifier_keys_released, 
    reset_browser_state
)
from controllers.desktop_controller import switch_desktop
from controllers.tab_controller import switch_to_random_tab
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
        # Different behavior based on which desktop we're on
        if self.current_desktop == 1:  # Browser desktop
            if action_type == "mouse_movement":
                self._perform_mouse_movements(activity_level)
            elif action_type == "keyboard_typing":
                self._perform_browser_typing()
            elif action_type == "tab_switching":
                self._perform_tab_switching()
            elif action_type == "desktop_switching":
                # Only switch to desktop 2
                self.switch_desktop(2)
        else:  # Desktop 2 - Neovim desktop
            if action_type == "mouse_movement":
                self._perform_mouse_movements(activity_level)
            elif action_type == "keyboard_typing":
                # On desktop 2, we only do Neovim commands, not regular typing
                self._perform_neovim_command()
            elif action_type == "tab_switching":
                # No tab switching on desktop 2, do a mouse movement instead
                self._perform_mouse_movements(activity_level)
            elif action_type == "desktop_switching":
                # Only switch to desktop 1
                self.switch_desktop(1)
    
    def _perform_mouse_movements(self, activity_level):
        """Perform a series of mouse movements."""
        movements = self.activity_manager.calculate_repetitions(4, activity_level)
        for _ in range(movements):
            ensure_modifier_keys_released()
            random_mouse_movement()
            time.sleep(self.activity_manager.get_pause_time("short"))
    
    def _perform_browser_typing(self):
        """Perform keyboard typing actions for browser."""
        ensure_modifier_keys_released()
        reset_browser_state()
        if random.random() < 0.5:
            random_keystroke(safe_for_neovim=False)
        else:
            random_programming_word()
    
    def _perform_neovim_command(self):
        """Perform a Neovim command."""
        ensure_modifier_keys_released()
        random_neovim_command()
    
    def _perform_tab_switching(self):
        """Switch to a random tab."""
        ensure_modifier_keys_released()
        switch_to_random_tab()
    
    def perform_browser_actions(self, activity_level=None):
        """Perform a sequence of browser-related actions."""
        if activity_level is None:
            activity_level = self.activity_manager.get_current_activity_level()
        
        repetitions = self.activity_manager.calculate_repetitions(5, activity_level)
        
        for i in range(repetitions):
            # Reset browser state before typing
            reset_browser_state()
            ensure_modifier_keys_released()

            random_mouse_movement()
            time.sleep(self.activity_manager.get_pause_time("short"))
            
            ensure_modifier_keys_released()
            
            random_keystroke(safe_for_neovim=False)
            
            time.sleep(self.activity_manager.get_pause_time("short"))
            
            ensure_modifier_keys_released()

            random_programming_word()
            
            if i < repetitions - 1: 
                time.sleep(self.activity_manager.get_pause_time("medium"))
                if random.random() < 0.7:  # 70% chance to switch tabs between actions
                    switch_to_random_tab()
                    time.sleep(self.activity_manager.get_pause_time("short"))
    
    def perform_neovim_actions(self, activity_level=None):
        """Perform a sequence of Neovim commands on Desktop 2."""
        if activity_level is None:
            activity_level = self.activity_manager.get_current_activity_level()
        
        # Calculate repetitions based on activity level but ensure minimum of 10
        repetitions = max(self.activity_manager.calculate_repetitions(4, activity_level), 10)
        
        # Optional: Do some mouse movements before executing Neovim commands
        mouse_movements = self.activity_manager.calculate_repetitions(4, activity_level)
        for _ in range(mouse_movements):
            random_mouse_movement()
            time.sleep(self.activity_manager.get_pause_time("short"))
        
        # Execute at least 10 Neovim commands
        for i in range(repetitions):
            ensure_modifier_keys_released()
            random_neovim_command()
            if i < repetitions - 1:
                time.sleep(self.activity_manager.get_pause_time("medium"))
    
    def perform_complex_sequence(self, activity_level=None):
        """Perform a complex sequence of actions across desktops."""
        if activity_level is None:
            activity_level = self.activity_manager.get_current_activity_level()
        
        # Browser actions on desktop 1
        self.switch_desktop(1)
        
        # Add extra mouse movements before browser actions
        mouse_movements = self.activity_manager.calculate_repetitions(6, activity_level)
        for _ in range(mouse_movements):
            random_mouse_movement()
            time.sleep(self.activity_manager.get_pause_time("short"))
        
        # Perform browser-specific actions (typing, tab switching, etc.)
        self.perform_browser_actions(activity_level)
        
        # Switch to desktop 2 for Neovim actions
        self.switch_desktop(2)
        
        # Perform Neovim-specific actions (commands and mouse movements only)
        self.perform_neovim_actions(activity_level)
