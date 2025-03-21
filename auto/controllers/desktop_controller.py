import random
import subprocess
import time
from utils.logger import log_message

def switch_desktop(desktop_number=None):
    """
    Switches to a specific macOS desktop using AppleScript.
    If no desktop number is provided, switches to a random desktop.
    
    :param desktop_number: (int) Desktop number to switch to (optional).
    """
    if desktop_number is None:
        desktop_number = random.randint(3, 4)  # Choose a random desktop between 3 and 4

    # AppleScript to switch desktops
    applescript_code = f'''
    tell application "System Events"
        key code {18 + (desktop_number - 1)} using control down
        delay 0.2
        -- Explicitly release the control key
        key up control
    end tell
    '''
    
    subprocess.run(["osascript", "-e", applescript_code])
    
    # Add a delay to ensure the desktop switch is complete
    time.sleep(0.5)
    
    log_message(f"Switched to Desktop {desktop_number}")
