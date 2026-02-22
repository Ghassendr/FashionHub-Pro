"""
Color extraction from images using frequency analysis
Extracts dominant colors from fabric images
"""

import io
from PIL import Image
from collections import Counter

def extract_main_color(image_file):
    """
    Extract main dominant color from image as RGB format
    Returns the most common/frequent pixel color (not mixed/averaged)
    
    Args:
        image_file: Django InMemoryUploadedFile or basic Python file object
    
    Returns:
        RGB_color: tuple (R, G, B) e.g., (255, 0, 0) for red
    """
    try:
        # Reset file pointer to beginning
        image_file.seek(0)
        
        # Read image
        image = Image.open(image_file)
        
        # Convert to RGB if necessary
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Resize for faster processing (smaller = faster)
        image = image.resize((50, 50))
        
        # Get pixel data
        pixels = list(image.getdata())
        
        # Find the most common/frequent pixel color
        try:
            pixel_counter = Counter(pixels)
            most_common_color = pixel_counter.most_common(1)[0][0]
            
            # Reset pointer again for Django to use the file afterwards
            image_file.seek(0)
            return list(most_common_color) # Array format for JSON
        except Exception as counter_error:
            print(f"Counter failed: {counter_error}, using fallback")
            r = int(sum(p[0] for p in pixels) / len(pixels))
            g = int(sum(p[1] for p in pixels) / len(pixels))
            b = int(sum(p[2] for p in pixels) / len(pixels))
            image_file.seek(0)
            return [r, g, b]
    
    except Exception as e:
        print(f"Error extracting main color: {e}")
        return [128, 128, 128]  # Default gray if error
