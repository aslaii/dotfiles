# /Users/jerichobermas/auto/main.py

import time
import random
import subprocess
from config import running
from activity_manager import ActivityManager
from action_performer import ActionPerformer
from utils.logger import log_message

def initialize_system(action_performer):
    """Initialize the system and set up the environment."""
    log_message("Starting money making script with configurable activity patterns")
    
    # Switch to desktop 1 to start
    action_performer.switch_desktop(1)
    
    # Initial setup via AppleScript
    applescript_code = '''
    tell application "System Events"
        key code 18 using command down
        delay 0.2
        -- Explicitly release the command key
        key up command
    end tell
    '''
    subprocess.run(["osascript", "-e", applescript_code])

def main_loop():
    """Main execution loop for the automation script."""
    # Initialize managers
    activity_manager = ActivityManager()
    action_performer = ActionPerformer()
    
    start_time = time.time()
    last_complex_action_time = 0
    last_switch_time = 0
    
    initialize_system(action_performer)
    
    while running:
        current_time = time.time()
        elapsed_time = current_time - start_time
        
        # Get current activity level and choose an action
        activity_level = activity_manager.get_current_activity_level()
        
        # Increase mouse movement frequency
        for _ in range(random.randint(2, 4)):  # Do 2-4 mouse movements each cycle
            action_performer._perform_mouse_movements(activity_level)
        
        # Keep keyboard activity based on current desktop
        if action_performer.current_desktop == 1:
            action_performer._perform_browser_typing()
        else:
            action_performer._perform_neovim_command()
        
        # Periodically switch to desktop 1 and perform browser actions
        if int(elapsed_time) // 30 > last_switch_time:
            action_performer.switch_desktop(1)
            action_performer.perform_browser_actions(activity_level)
            last_switch_time = int(elapsed_time) // 30
        
        # Occasionally perform complex action sequence
        if random.random() < 0.6 and current_time - last_complex_action_time > 15:
            action_performer.perform_complex_sequence(activity_level)
            last_complex_action_time = current_time
        
        # Pause between action cycles based on activity level
        time.sleep(2)  # Base pause of 2 seconds as in original code
    
    log_message("Script has exited.")

if __name__ == "__main__":
    main_loop()
