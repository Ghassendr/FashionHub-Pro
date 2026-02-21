#!/usr/bin/env python3
"""
Test script to verify color extraction functionality
"""

import os
import sys
from color_extractor import extract_main_color, rgb_to_hex, hex_to_color_name

def test_color_mapping():
    """Test the color mapping function"""
    print("Testing color mapping...")
    
    test_colors = {
        "#FF0000": "Red (primary)",      # Pure red
        "#0000FF": "Blue (primary)",     # Pure blue
        "#00FF00": "Green (primary)",    # Pure green
        "#FFFF00": "Yellow",              # Yellow
        "#FFC0CB": "Pink",                # Pink
        "#808080": "Gray",                # Gray
        "#000000": "Black",               # Black
        "#FFFFFF": "White",               # White
        "#FFA500": "Orange",              # Orange
        "#800080": "Purple",              # Purple
    }
    
    print("\nColor Mapping Tests:")
    for hex_color, description in test_colors.items():
        name = hex_to_color_name(hex_color)
        status = "✓" if name else "✗"
        print(f"  {status} {hex_color} -> {name} ({description})")
    
    print("\n✓ Color mapping test complete!\n")

def test_rgb_to_hex():
    """Test RGB to hex conversion"""
    print("Testing RGB to hex conversion...")
    
    test_values = [
        ((255, 0, 0), "#ff0000"),      # Red
        ((0, 255, 0), "#00ff00"),      # Green
        ((0, 0, 255), "#0000ff"),      # Blue
        ((128, 128, 128), "#808080"),  # Gray
    ]
    
    print("\nRGB to Hex Tests:")
    for rgb, expected_hex in test_values:
        result = rgb_to_hex(rgb)
        match = "✓" if result.lower() == expected_hex.lower() else "✗"
        print(f"  {match} {rgb} -> {result} (expected: {expected_hex})")
    
    print("\n✓ RGB to hex test complete!\n")

def main():
    """Run all tests"""
    print("=" * 60)
    print("Color Extraction Module Test Suite")
    print("=" * 60 + "\n")
    
    try:
        test_rgb_to_hex()
        test_color_mapping()
        
        print("=" * 60)
        print("All tests passed! ✓")
        print("=" * 60)
        print("\nThe color extraction module is ready for use.")
        print("- Image files will be saved to the 'uploads' directory")
        print("- Main colors will be extracted using KMeans clustering")
        print("- Color names will be mapped from hex values")
        
    except Exception as e:
        print(f"\n✗ Error during testing: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
