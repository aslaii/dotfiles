# /Users/jerichobermas/auto/controllers/keyboard_controller.py
import random
from pynput.keyboard import Controller
from utils.logger import log_message

keyboard_controller = Controller()

def random_keystroke():
    """Simulates a random keystroke."""
    keys = ['a', 's', 'd', 'w', 'q', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '1', '2', '3']
    key = random.choice(keys)
    keyboard_controller.press(key)
    keyboard_controller.release(key)
    log_message(f"Typed: {key}")

