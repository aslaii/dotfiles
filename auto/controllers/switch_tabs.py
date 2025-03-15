import time
import random
import pyautogui
import pytesseract
import cv2
import numpy as np
from PIL import Image
from utils.logger import log_message

TARGET_TABS = ["SWAGGER DOCS", "FIREBASE", "GITHUB", "CLAUDE", "CHATGPT"]

def enhance_image_for_ocr(img):
    """Enhances image for better OCR recognition."""
    # Convert to grayscale
    gray = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2GRAY)
    
    # Increase contrast
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    enhanced = clahe.apply(gray)
    
    # Denoise
    denoised = cv2.fastNlMeansDenoising(enhanced)
    
    # Threshold
    _, binary = cv2.threshold(denoised, 150, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    return binary

def get_screen_text_with_positions():
    """Captures and processes screen regions for better OCR accuracy."""
    # Capture only the left side of the screen where Arc tabs are located
    screenshot = pyautogui.screenshot(region=(0, 0, 300, 1000))
    
    # Process image
    processed = enhance_image_for_ocr(screenshot)
    processed_image = Image.fromarray(processed)
    
    # Save debug image
    debug_path = "/Users/jerichobermas/Desktop/ocr_debug.png"
    processed_image.save(debug_path)
    log_message(f"Saved processed OCR debug image to: {debug_path}")
    
    # Configure OCR for better accuracy
    custom_config = r'--oem 3 --psm 11'
    data = pytesseract.image_to_data(processed_image, output_type=pytesseract.Output.DICT, config=custom_config)
    
    extracted_data = []
    for i in range(len(data["text"])):
        text = data["text"][i].strip()
        if text and len(text) > 2:  # Filter out very short strings
            conf = int(data["conf"][i])
            if conf > 60:  # Only consider high-confidence results
                x, y = data["left"][i], data["top"][i]
                w, h = data["width"][i], data["height"][i]
                extracted_data.append({
                    "text": text,
                    "x": x,
                    "y": y,
                    "w": w,
                    "h": h,
                    "conf": conf
                })
                log_message(f"Detected: '{text}' at ({x}, {y}) with confidence {conf}%")
    
    return extracted_data

def find_and_click_target():
    """Finds and clicks on random target tab with improved accuracy and reliability."""
    log_message("Scanning for target tabs...")
    detected_texts = get_screen_text_with_positions()
    
    # Store all valid matches
    valid_matches = []
    
    for tab in TARGET_TABS:
        best_match = None
        highest_conf = -1
        
        for detected in detected_texts:
            # Handle special cases for tab names
            detected_text = detected["text"].lower()
            tab_lower = tab.lower()
            
            # Special case for "SWAGGER DOCS"
            if tab_lower == "swagger docs" and ("swagger" in detected_text or "docs" in detected_text):
                # If we find either part, look for the other part nearby
                y_pos = detected["y"]
                for other_detected in detected_texts:
                    if abs(other_detected["y"] - y_pos) < 30:  # Check texts within 30 pixels vertically
                        combined_text = f"{detected_text} {other_detected['text'].lower()}"
                        if "swagger" in combined_text and "docs" in combined_text:
                            if detected["conf"] > highest_conf:
                                best_match = detected
                                highest_conf = detected["conf"]
            # Normal matching for other tabs
            elif tab_lower in detected_text and detected["conf"] > highest_conf:
                best_match = detected
                highest_conf = detected["conf"]
        
        if best_match:
            valid_matches.append((tab, best_match, highest_conf))
    
    # If we found any valid matches, randomly select one
    if valid_matches:
        log_message(f"Found {len(valid_matches)} valid tabs to choose from:")
        for t, m, c in valid_matches:
            log_message(f"- {t} (confidence: {c}%)")
        
        tab, best_match, highest_conf = random.choice(valid_matches)

        
        if best_match:
            # Calculate click position (center of text box)
            x = best_match["x"] + best_match["w"] // 2
            y = best_match["y"] + best_match["h"] // 2
            
            log_message(f"Found tab '{tab}' at ({x}, {y}) with {highest_conf}% confidence")
            
            pyautogui.moveTo(x, y, duration=0.5)
            log_message(f"Moved mouse to ({x}, {y})")

            pyautogui.keyUp("shift")
            pyautogui.keyUp("ctrl")
            pyautogui.keyUp("command")
            pyautogui.keyUp("option")
            log_message("Ensured no modifier keys are held")


            time.sleep(1)
            
            # First Left Click
            log_message("Performing first left click")
            pyautogui.click(x, y, button="left")

            # Mouse Down & Up (Ensuring Single Click)
            log_message("Performing mouse down and up to reinforce click")
            pyautogui.mouseDown(x, y, button="left")
            time.sleep(0.1)  # Small delay to mimic real human click
            pyautogui.mouseUp(x, y, button="left")

            # Optional: Double Click for reliability
            log_message("Performing second left click (double click)")
            pyautogui.click(x, y, button="left")

            time.sleep(0.1)
            log_message("Click sequence completed successfully")
            return True
            
        log_message("No valid target tabs found")
        return False

def switch_tabs():
    """Main tab switching function with retry mechanism."""
    max_attempts = 3
    for attempt in range(max_attempts):
        log_message(f"Attempt {attempt + 1}/{max_attempts} to switch tabs")
        if find_and_click_target():
            return True
        time.sleep(0.5)
    return False

if __name__ == "__main__":
    switch_tabs()
