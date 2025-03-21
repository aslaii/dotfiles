import random
import subprocess
import time
from utils.logger import log_message
from controllers.keyboard_controller import ensure_modifier_keys_released

def switch_to_random_tab():
    """
    Switches to a random tab (3-9) using Command + <number> on macOS.
    """
    chosen_tab = random.choice([3, 4, 5, 6, 7, 8, 9])
    log_message(f"Switching to tab {chosen_tab} using Command + {chosen_tab}")

    # AppleScript to switch tabs using Command + <number>
    applescript_code = f'''
    tell application "System Events"
        key code {18 + (chosen_tab - 1)} using command down
        delay 0.2
        -- Explicitly release the command key
        key up command
    end tell
    '''

    # Execute AppleScript
    subprocess.run(["osascript", "-e", applescript_code])
    
    # Add a delay to ensure the command is complete and keys are released
    time.sleep(0.5)
    
    # Explicitly ensure all modifier keys are released
    ensure_modifier_keys_released()

    reload_reset_page()

    
    log_message(f"Switched to tab {chosen_tab}")

    
def reload_reset_page():
    """
    Reloads the current page using Command+R and then resets to pin URL using Command+C.
    """
    log_message("Reloading page with Command+R")
    
    # AppleScript to press Command+R to reload
    reload_script = '''
    tell application "System Events"
        key code 15 using command down
        delay 0.2
        -- Explicitly release the command key
        key up command
    end tell
    '''
    
    # Execute reload AppleScript
    subprocess.run(["osascript", "-e", reload_script])
    
    # Add a delay to ensure the reload command is complete
    time.sleep(2)  # Longer delay to allow page to reload
    
    log_message("Resetting page to pin URL with Command+C")
    
    # AppleScript to press Command+C to reset to pin URL
    reset_script = '''
    tell application "System Events"
        key code 8 using command down
        delay 0.2
        -- Explicitly release the command key
        key up command
    end tell
    '''
    
    # Execute reset AppleScript
    subprocess.run(["osascript", "-e", reset_script])
    
    # Add a delay to ensure the reset command is complete
    time.sleep(1)
    
    # Explicitly ensure all modifier keys are released
    ensure_modifier_keys_released()
    
    log_message("Page reloaded and reset to pin URL")
