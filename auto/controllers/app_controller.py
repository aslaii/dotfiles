# /Users/jerichobermas/auto/controllers/app_controller.py
import subprocess
from AppKit import NSWorkspace
from config import ZEN_BROWSER_NAME
from utils.logger import log_message

def get_active_app():
    """Returns the name of the currently focused application."""
    active_app = NSWorkspace.sharedWorkspace().activeApplication()
    return active_app.get("NSApplicationName", "")

def focus_arc():
    """Brings Arc Browser to the foreground if not active."""
    if get_active_app() != ZEN_BROWSER_NAME:
        log_message("Focusing Zen Browser...")
        subprocess.run(["open", "-a", ZEN_BROWSER_NAME])
