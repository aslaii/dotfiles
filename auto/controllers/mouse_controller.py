# /Users/jerichobermas/auto/controllers/mouse_controller.py
import time
import random
from pynput.mouse import Controller
from config import SCREEN_WIDTH, SCREEN_HEIGHT
from utils.logger import log_message

mouse_controller = Controller()

def smooth_mouse_move(target_x, target_y, duration=0.5):
    """Moves the mouse smoothly to a target position and clicks."""
    start_x, start_y = mouse_controller.position
    steps = 50
    step_time = duration / steps

    for i in range(steps):
        new_x = int(start_x + (target_x - start_x) * (i / steps))
        new_y = int(start_y + (target_y - start_y) * (i / steps))
        mouse_controller.position = (new_x, new_y)
        time.sleep(step_time)

    mouse_controller.position = (target_x, target_y)
    # mouse_controller.click(Button.left, 1)
    log_message(f"Mouse moved smoothly and clicked at ({target_x}, {target_y})")

def random_mouse_movement():
    """Generates a random mouse movement within the screen."""
    target_x, target_y = random.randint(100, SCREEN_WIDTH-100), random.randint(100, SCREEN_HEIGHT-100)
    smooth_mouse_move(target_x, target_y)
