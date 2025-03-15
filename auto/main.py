# /Users/jerichobermas/auto/main.py
import time
import random
from config import running
from controllers.mouse_controller import random_mouse_movement
from controllers.keyboard_controller import random_keystroke
from controllers.desktop_controller import switch_desktop
from controllers.tab_controller import switch_to_random_tab
from utils.logger import log_message

# Flag to stop script
def stop_script():
    global running
    running = False
    log_message("Script stopped by user.")

    
log_message("Starting money making script")

start_time = time.time()
last_switch_time = 0

while running:
    elapsed_time = time.time() - start_time

    # Perform random mouse movements and keystrokes every 10 seconds
    random_mouse_movement()
    random_keystroke()

    # Switch desktops every 30 seconds (ensuring it happens only once)
    if int(elapsed_time) // 30 > last_switch_time:
        switch_desktop()
        last_switch_time = int(elapsed_time)

    # Switch Arc Browser tabs only if Arc is focused
    if random.random() < 0.3:
        switch_desktop(1)
        time.sleep(15)
        switch_to_random_tab()
        time.sleep(15)
        switch_desktop(2)

    time.sleep(5)  # Sleep to avoid excessive CPU usage

log_message("Script has exited.")
