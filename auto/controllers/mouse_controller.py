# controllers/mouse_controller.py
import random
import time
from pynput.mouse import Controller
from config import SCREEN_WIDTH, SCREEN_HEIGHT
from utils.logger import log_message

mouse_controller = Controller()


def smooth_mouse_move(target_x, target_y, duration=0.5):
    """Moves the mouse smoothly to a target position."""
    start_x, start_y = mouse_controller.position
    steps = 50
    step_time = duration / steps

    for i in range(steps):
        new_x = int(start_x + (target_x - start_x) * (i / steps))
        new_y = int(start_y + (target_y - start_y) * (i / steps))
        mouse_controller.position = (new_x, new_y)
        time.sleep(step_time)

    mouse_controller.position = (target_x, target_y)
    log_message(f"Mouse moved smoothly to ({target_x}, {target_y})")


def random_mouse_movement():
    """Generates more frequent and varied mouse movements within the screen."""
    # Create more natural movement patterns with multiple points
    num_points = random.randint(2, 5)
    for _ in range(num_points):
        # Avoid edges and menu bars where accidental interactions might occur
        target_x = random.randint(200, SCREEN_WIDTH - 200)
        target_y = random.randint(200, SCREEN_HEIGHT - 200)
        # Vary the movement speed for more natural behavior
        duration = random.uniform(0.3, 0.8)
        smooth_mouse_move(target_x, target_y, duration)
        # Add small pauses between movements
        time.sleep(random.uniform(0.1, 0.4))
    # Add a small delay after movement
    time.sleep(0.2)


def random_scroll():
    """Randomly scrolls the mouse wheel up or down."""
    # Determine a random number of scroll steps (e.g., 1 to 5 steps)
    scroll_steps = random.randint(1, 5)
    # Randomly decide the scroll direction: up (+) or down (-)
    direction = random.choice([1, -1])
    mouse_controller.scroll(0, direction * scroll_steps)
    log_message(
        f"Scrolled {'up' if direction > 0 else 'down'} by {scroll_steps} steps"
    )
    # Optionally, add a brief pause after scrolling
    time.sleep(0.2)
