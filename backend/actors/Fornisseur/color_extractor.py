"""
Color extraction from images using frequency analysis
Extracts dominant colors from fabric images
"""

import io
import base64
from PIL import Image
from collections import Counter
import colorsys

def rgb_to_hex(rgb):
    """Convert RGB tuple to hex color"""
    return '#{:02x}{:02x}{:02x}'.format(int(rgb[0]), int(rgb[1]), int(rgb[2]))

def hex_to_color_name(hex_color):
    """Convert hex color to close color name"""
    hex_color = hex_color.lstrip('#')
    rgb = tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
    
    # Color name mapping
    color_names = {
        'Red': ((255, 0, 0), (220, 20, 60)),
        'Blue': ((0, 0, 255), (65, 105, 225)),
        'Green': ((0, 128, 0), (34, 139, 34)),
        'Yellow': ((255, 255, 0), (255, 215, 0)),
        'Black': ((0, 0, 0), (50, 50, 50)),
        'White': ((255, 255, 255), (220, 220, 220)),
        'Gray': ((128, 128, 128), (105, 105, 105)),
        'Pink': ((255, 192, 203), (255, 105, 180)),
        'Purple': ((128, 0, 128), (147, 112, 219)),
        'Orange': ((255, 165, 0), (255, 140, 0)),
        'Brown': ((165, 42, 42), (139, 69, 19)),
        'Beige': ((245, 245, 220), (222, 184, 135)),
    }
    
    closest_color = 'Other'
    closest_distance = float('inf')
    
    for color_name, color_range in color_names.items():
        # Find distance to closest color in range
        for base_rgb in color_range:
            distance = sum((c1 - c2) ** 2 for c1, c2 in zip(rgb, base_rgb)) ** 0.5
            if distance < closest_distance:
                closest_distance = distance
                closest_color = color_name
    
    return closest_color if closest_distance < 100 else 'Other'

def extract_main_color(image_file):
    """
    Extract main dominant color from image as RGB format
    Returns the most common/frequent pixel color (not mixed/averaged)
    
    Args:
        image_file: File object from upload (werkzeug FileStorage)
    
    Returns:
        Tuple of (RGB_color, image_bytes)
        RGB_color: tuple (R, G, B) e.g., (255, 0, 0) for red
        image_bytes: binary image data for MongoDB storage
    """
    try:
        # Reset file pointer to beginning
        image_file.seek(0)
        
        # Read image
        image = Image.open(image_file)
        
        # Save image bytes for MongoDB storage
        image_file.seek(0)
        image_bytes = image_file.read()
        
        # Convert to RGB if necessary
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Resize for faster processing (smaller = faster)
        image = image.resize((50, 50))
        
        # Get pixel data
        pixels = list(image.getdata())
        
        # Find the most common/frequent pixel color (dominant color - NOT mixed)
        try:
            # Count frequency of each pixel color
            pixel_counter = Counter(pixels)
            # Get the most common color
            most_common_color = pixel_counter.most_common(1)[0][0]
            return most_common_color, image_bytes
        except Exception as counter_error:
            # Fallback: if Counter fails, use average as last resort
            print(f"Counter failed: {counter_error}, using fallback")
            r = int(sum(p[0] for p in pixels) / len(pixels))
            g = int(sum(p[1] for p in pixels) / len(pixels))
            b = int(sum(p[2] for p in pixels) / len(pixels))
            return (r, g, b), image_bytes
    
    except Exception as e:
        print(f"Error extracting main color: {e}")
        return (128, 128, 128), None  # Default gray if error
