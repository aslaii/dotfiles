import random
import subprocess
import time
from pynput.mouse import Controller, Button
from utils.logger import log_message

mouse_controller = Controller()

def switch_to_random_tab():
    """
    Switches to a random tab (2, 3, 4, or 5) using Command + <number> on macOS.
    """
    chosen_tab = random.choice([6, 7, 8, 9, 10, 11, 12])
    log_message(f"Switching to tab {chosen_tab} using Command + {chosen_tab}")

    # AppleScript to switch tabs using Command + <number>
    applescript_code = f'''
    tell application "System Events"
        key code {18 + (chosen_tab - 1)} using command down
    end tell
    '''

    # Execute AppleScript
    subprocess.run(["osascript", "-e", applescript_code])

    log_message(f"Switched to tab {chosen_tab}")

    # Click at the center of the screen to ensure focus
    center_x, center_y = 960, 540
    mouse_controller.position = (center_x, center_y)
    time.sleep(0.1)
    mouse_controller.click(Button.left, 1)
    log_message("Clicked center of the screen to ensure focus.")

# Run the function
switch_to_random_tab()
