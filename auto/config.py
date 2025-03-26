# /Users/jerichobermas/auto/config.py

# Main control flag
running = True  # Flag to control script execution

# Browser settings
ZEN_BROWSER_NAME = "Zen Browser"
ARC_ALLOWED_TABS = ["swagger", "firebase", "explore"]

# Screen dimensions
SCREEN_WIDTH = 1710  # Adjust according to your resolution
SCREEN_HEIGHT = 1112

# Activity pattern settings
ACTIVITY_SETTINGS = {
    # Controls the overall activity level (higher = more actions per minute)
    "activity_level": 0.7,  # 0.1 (minimal) to 1.0 (maximum)
    
    # Controls how much the activity varies over time
    "randomness_factor": 0.4,  # 0.0 (consistent) to 1.0 (highly variable)
    
    # Controls the distribution of different action types
    "action_weights": {
        "mouse_movement": 0.5,    # Relative weight of mouse movements
        "keyboard_typing": 0.3,   # Relative weight of typing actions
        "tab_switching": 0.1,     # Relative weight of tab switches
        "desktop_switching": 0.1, # Relative weight of desktop switches
    },
    
    # Time ranges (in seconds) for pauses between actions
    "pause_times": {
        "short": (0.3, 1.2),      # Range for short pauses
        "medium": (1.5, 3.5),     # Range for medium pauses
        "long": (4.0, 8.0),       # Range for longer breaks
    },
    
    # Controls the pattern of activity throughout the day
    "activity_pattern": {
        "bursts_enabled": True,   # Enable periods of higher activity
        "burst_frequency": 0.2,   # How often bursts occur (0.0-1.0)
        "burst_intensity": 1.5,   # Multiplier for activity during bursts
        "burst_duration": (30, 120),  # Duration range of bursts in seconds
        
        "breaks_enabled": True,   # Enable occasional breaks in activity
        "break_frequency": 0.1,   # How often breaks occur (0.0-1.0)
        "break_duration": (60, 300),  # Duration range of breaks in seconds
    },
    
    # Controls the daily pattern (simulating natural work patterns)
    "daily_pattern_enabled": True,  # Enable daily activity patterns
    "daily_pattern": {
        # Hour: activity multiplier (1.0 = normal, 0.0 = none)
        # Simulates lower activity during lunch, higher focus periods, etc.
        9: 0.8,   # Morning ramp-up
        10: 1.0,  # Morning productivity
        11: 1.1,  # Late morning focus
        12: 0.5,  # Lunch time
        13: 0.6,  # Post-lunch recovery
        14: 0.9,  # Early afternoon
        15: 1.0,  # Mid-afternoon productivity
        16: 1.1,  # Late afternoon focus
        17: 0.8,  # End of day wind-down
    }
}
