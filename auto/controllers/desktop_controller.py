import random
import subprocess
import time
from pynput.mouse import Controller, Button
from utils.logger import log_message

mouse_controller = Controller()

def switch_desktop(desktop_number=None):
    """
    Switches to a specific macOS desktop using AppleScript.
    If no desktop number is provided, switches to a random desktop.
    
    :param desktop_number: (int) Desktop number to switch to (optional).
    """
    if desktop_number is None:
        desktop_number = random.randint(3, 4)  # Choose a random desktop between 1 and 3

    # AppleScript to switch desktops
    applescript_code = f'''
    tell application "System Events"
        key code {18 + (desktop_number - 1)} using control down
    end tell
    '''
    
    subprocess.run(["osascript", "-e", applescript_code])
    log_message(f"Switched to Desktop {desktop_number}")

    # Click at the center of the screen to ensure focus
    center_x, center_y = 960, 540
    mouse_controller.position = (center_x, center_y)
    time.sleep(0.1)
    mouse_controller.click(Button.left, 1)
    log_message("Clicked center of the screen to ensure focus.")

