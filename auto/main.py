import time
import random
import subprocess
from config import running
from controllers.mouse_controller import random_mouse_movement
from controllers.keyboard_controller import random_keystroke, random_programming_word, random_neovim_command, ensure_modifier_keys_released, reset_browser_state
from controllers.desktop_controller import switch_desktop
from controllers.tab_controller import switch_to_random_tab
from utils.logger import log_message

def perform_browser_actions(repetitions, sleep_times):
    """Perform a sequence of browser-related actions."""
    for i in range(repetitions):
        # Reset browser state before typing
        reset_browser_state()
        ensure_modifier_keys_released()

        random_mouse_movement()
        time.sleep(0.3)
        
        ensure_modifier_keys_released()
        
        random_keystroke(safe_for_neovim=False)
        
        time.sleep(0.3)
        
        ensure_modifier_keys_released()

        random_programming_word()
        
        if i < repetitions - 1: 
            time.sleep(sleep_times[i] if i < len(sleep_times) else 2)
            switch_to_random_tab()
            time.sleep(0.7)

def perform_neovim_actions(repetitions, sleep_times):
    """Perform a sequence of Neovim commands."""
    for i in range(repetitions):
        reset_browser_state()
        random_neovim_command()
        if i < len(sleep_times) and i < repetitions - 1:
            time.sleep(sleep_times[i])

def complex_action_sequence():
    """Perform a complex sequence of actions across desktops with more mouse activity."""
    # Browser actions on desktop 1
    switch_desktop(1)
    ensure_modifier_keys_released()
    
    # Add extra mouse movements before browser actions
    for _ in range(random.randint(3, 6)):
        random_mouse_movement()
        time.sleep(random.uniform(0.3, 0.7))
    
    perform_browser_actions(4, [3, 3, 2, 1])
    
    switch_desktop(2)
    ensure_modifier_keys_released()
    
    # Add extra mouse movements before Neovim actions
    for _ in range(random.randint(2, 4)):
        random_mouse_movement()
        time.sleep(random.uniform(0.3, 0.7))
    
    perform_neovim_actions(4, [2, 3])

log_message("Starting money making script")

start_time = time.time()
last_switch_time = 0

switch_desktop(1)

applescript_code = f'''
tell application "System Events"
    key code {18 + 0} using command down
    delay 0.2
    -- Explicitly release the command key
    key up command
end tell
'''
subprocess.run(["osascript", "-e", applescript_code])


while running:
    elapsed_time = time.time() - start_time

    # Increase mouse movement frequency
    for _ in range(random.randint(2, 4)):  # Do 2-4 mouse movements each cycle
        ensure_modifier_keys_released()
        random_mouse_movement()
        time.sleep(random.uniform(0.5, 1.5))  # Varied pauses between movements
    
    # Keep keyboard activity at the same level
    random_keystroke()

    if int(elapsed_time) // 30 > last_switch_time:
        ensure_modifier_keys_released()
        switch_desktop(1)
        ensure_modifier_keys_released()
        perform_browser_actions(4, [3, 3, 2, 1])
        last_switch_time = int(elapsed_time) // 30

    if random.random() < 0.6:
        complex_action_sequence()

    time.sleep(2)

log_message("Script has exited.")
