# /Users/jerichobermas/auto/controllers/keyboard_controller.py
import random
import subprocess
import time
from pynput.keyboard import Controller
from utils.logger import log_message

keyboard_controller = Controller()


def ensure_modifier_keys_released():
    """Ensures all modifier keys are released using AppleScript."""
    applescript_code = '''
    tell application "System Events"
        key up command
        key up control
        key up option
        key up shift
    end tell
    '''
    subprocess.run(['osascript', '-e', applescript_code])
    log_message("Released all modifier keys")


def simulate_ctrl_tab():
    """Simulates pressing CTRL+TAB to switch tabs."""
    ensure_modifier_keys_released()
    applescript_code = '''
    tell application "System Events"
        key down control
        delay 0.05
        key code 48 -- 48 is the key code for TAB
        delay 0.05
        key up control
    end tell
    '''
    try:
        subprocess.run(
            ["osascript", "-e", applescript_code], check=True, capture_output=True
        )
        log_message("Simulated CTRL+TAB")
    except subprocess.CalledProcessError as e:
        log_message(f"Error simulating CTRL+TAB: {e.stderr.decode()}")
    # Add a small pause after switching tabs
    time.sleep(0.2)
    ensure_modifier_keys_released()  # Ensure control is released


def random_keystroke(safe_for_neovim=False):
    """
    Simulates a random keystroke.

    Args:
        safe_for_neovim (bool): If True, only uses keys that won't trigger 
                               insert mode in Neovim.
    """
    if safe_for_neovim:
        # Keys that don't trigger insert mode in Neovim
        keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=',
                '[', ']', '\\', ';', "'", ',', '.', '/', '`']
    else:
        # General keys for typing in other applications
        keys = ['a', 's', 'd', 'w', 'q', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p',
                '1', '2', '3', '4', '5', '6', '7', '8', '9', '0']

    key = random.choice(keys)
    keyboard_controller.press(key)
    keyboard_controller.release(key)
    log_message(f"Typed: {key}")


def random_programming_word():
    """Simulates typing a random programming word."""
    programming_words = [
        'function', 'variable', 'class', 'method', 'object',
        'array', 'string', 'integer', 'boolean', 'loop',
        'recursion', 'algorithm', 'parameter', 'return', 'import',
        'module', 'library', 'framework', 'debug', 'compile'
    ]
    word = random.choice(programming_words)

    # Type the word character by character
    for char in word:
        keyboard_controller.press(char)
        keyboard_controller.release(char)

    log_message(f"Typed programming word: {word}")


def random_neovim_command():
    """Simulates a random non-destructive Neovim command using LazyVim keys."""
    # List of safe Neovim navigation commands including LazyVim keys
    neovim_commands = [
        # Simple navigation commands (single key)
        {'keys': ['j'], 'description': 'Move down'},
        {'keys': ['k'], 'description': 'Move up'},
        {'keys': ['h'], 'description': 'Move left'},
        {'keys': ['l'], 'description': 'Move right'},
        {'keys': ['w'], 'description': 'Move forward by word'},
        {'keys': ['b'], 'description': 'Move backward by word'},
        {'keys': ['e'], 'description': 'Move to end of word'},
        {'keys': ['0'], 'description': 'Go to start of line'},
        {'keys': ['$'], 'description': 'Go to end of line'},
        {'keys': ['^'], 'description': 'Go to first non-blank character'},
        {'keys': ['%'], 'description': 'Jump to matching bracket'},

        # Multi-key commands
        {'keys': ['g', 'g'], 'description': 'Go to top of file (gg)'},
        {'keys': ['G'], 'description': 'Go to bottom of file (Shift+G)'},

        # LazyVim buffer commands using shift keys
        {'keys': ['H'], 'description': 'Move buffer left (Shift+H)'},
        # LazyVim
        {'keys': ['L'], 'description': 'Move buffer right (Shift+L)'},

        # Other multi-key commands from before
        {'keys': ['z', 'z'], 'description': 'Center screen on cursor'},
        {'keys': ['z', 't'], 'description': 'Scroll to put cursor at top'},
        {'keys': ['z', 'b'], 'description': 'Scroll to put cursor at bottom'},

        # Shift key commands using AppleScript (optional; if needed)
        {'applescript': 'key code 5 using {shift down}',
            'description': 'Go to bottom of file (G)'},
        {'applescript': 'key code 4 using {shift down}',
            'description': 'Move to top of screen (H)'},
        {'applescript': 'key code 46 using {shift down}',
            'description': 'Move to middle of screen (M)'},
        {'applescript': 'key code 37 using {shift down}',
            'description': 'Move to bottom of screen (L)'},
    ]

    # Choose a random command
    command = random.choice(neovim_commands)

    # Execute the command
    if 'applescript' in command:
        # Use AppleScript for commands with modifier keys
        applescript_code = f'''
        tell application "System Events"
            {command['applescript']}
        end tell
        '''
        subprocess.run(['osascript', '-e', applescript_code])
        log_message(f"Executed Neovim command: {command['description']}")
    else:
        # Using pynput for simple key presses.
        # For multi-key commands, press each key
        for key in command['keys']:
            keyboard_controller.press(key)
            keyboard_controller.release(key)
        log_message(
            f"Executed Neovim command: {command['description']} "
            f"({' '.join(command['keys'])})"
        )


def reset_browser_state():
    """
    Resets browser zoom level with CMD+0 and cancels any ongoing input with ESC.
    """
    # First ensure all modifier keys are released
    ensure_modifier_keys_released()

    # Reset zoom with CMD+0
    applescript_code = '''
    tell application "System Events"
        -- Reset zoom with CMD+0
        key down command
        keystroke "0"
        delay 0.1
        key up command
        delay 0.3
        
        -- Press ESC to cancel any ongoing input
        key code 53  -- ESC key
        delay 0.2
    end tell
    '''

    subprocess.run(['osascript', '-e', applescript_code])
    log_message("Reset browser zoom (CMD+0) and pressed ESC to cancel input")
