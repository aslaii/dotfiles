# /Users/jerichobermas/auto/activity_manager.py

import random
import datetime
import time
from config import ACTIVITY_SETTINGS
from utils.logger import log_message

class ActivityManager:
    """Manages activity patterns and decision making for the automation."""
    
    def get_current_activity_level(self):
        """Calculate the current activity level based on time and settings."""
        settings = ACTIVITY_SETTINGS
        base_level = settings["activity_level"]
        
        # Apply daily pattern if enabled
        if settings["daily_pattern_enabled"]:
            current_hour = datetime.datetime.now().hour
            hour_multiplier = settings["daily_pattern"].get(current_hour, 1.0)
            base_level *= hour_multiplier
        
        # Apply randomness
        randomness = settings["randomness_factor"]
        random_factor = 1.0 + (random.random() * 2 - 1) * randomness
        
        # Check if we're in a burst period
        if settings["activity_pattern"]["bursts_enabled"] and random.random() < settings["activity_pattern"]["burst_frequency"]:
            base_level *= settings["activity_pattern"]["burst_intensity"]
            log_message("Activity burst activated")
        
        # Check if we're in a break period
        if settings["activity_pattern"]["breaks_enabled"] and random.random() < settings["activity_pattern"]["break_frequency"]:
            break_duration = random.uniform(*settings["activity_pattern"]["break_duration"])
            log_message(f"Taking a break for {break_duration:.1f} seconds")
            time.sleep(break_duration)
            return 0.1  # Minimal activity during breaks
        
        return max(0.1, min(1.0, base_level * random_factor))  # Clamp between 0.1 and 1.0
    
    def get_pause_time(self, pause_type="medium"):
        """Get a random pause time based on the configured ranges."""
        min_time, max_time = ACTIVITY_SETTINGS["pause_times"][pause_type]
        return random.uniform(min_time, max_time)
    
    def get_appropriate_pause(self, activity_level):
        """Determine appropriate pause duration based on activity level."""
        if activity_level > 0.7:
            return self.get_pause_time("short")
        elif activity_level > 0.3:
            return self.get_pause_time("medium")
        else:
            return self.get_pause_time("long")
    
    def choose_action(self):
        """Choose an action based on the configured weights."""
        weights = ACTIVITY_SETTINGS["action_weights"]
        actions = list(weights.keys())
        probabilities = list(weights.values())
        
        # Normalize probabilities to sum to 1
        total = sum(probabilities)
        normalized_probs = [p/total for p in probabilities]
        
        return random.choices(actions, normalized_probs)[0]
    
    def calculate_repetitions(self, base_count, activity_level):
        """Calculate number of repetitions based on activity level."""
        return max(1, int(activity_level * base_count))
