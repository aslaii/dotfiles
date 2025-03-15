import time

def log_message(message):
    """Logs messages with a timestamp."""
    print(f"[{time.strftime('%H:%M:%S')}] {message}")
