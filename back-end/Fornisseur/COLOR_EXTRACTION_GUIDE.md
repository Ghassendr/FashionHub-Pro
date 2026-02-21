# Fabric Color Extraction System - Implementation Guide

## Overview

This document describes the complete implementation of automatic fabric color extraction from images for the ProjetCTR fabric inventory management system.

## System Architecture

### 1. Frontend (React/Dashboard.jsx)

**Purpose**: Allows users to upload fabric images and view extracted colors

**Key Features**:

- Image upload with preview
- Automatic color extraction via Python backend
- Display of extracted colors as color tags in table
- Image storage and retrieval management

**Implementation Details**:

- Uses `FileReader` API for image preview
- `FormData` for multipart/form-data file uploads
- Fetches images from backend via `/api/images/<filename>` endpoint
- Displays colors as styled badges with color backgrounds

**Flow**:

1. User selects image file
2. Frontend shows preview (DataURL)
3. Form submitted as multipart/form-data
4. Backend saves image and extracts colors
5. Colors returned and displayed in table
6. Image fetched and displayed from backend on mount

### 2. Backend (Flask/Python)

#### Color Extraction Module (`color_extractor.py`)

Core module handling image processing and color extraction.

**Key Functions**:

```python
def extract_main_colors(image_data, num_colors=5)
```

- **Input**: File object or image bytes
- **Process**:
  1. Load image using PIL
  2. Resize to 100x100 for speed optimization
  3. Convert to RGB format
  4. Reshape pixel data to 1D array
  5. Apply KMeans clustering with k=5 clusters
  6. Extract cluster centers (dominant colors)
  7. Sort by frequency (color count)
  8. Convert RGB to hex and then to color names
- **Output**: List of 5 dominant color names
- **Performance**: ~100-500ms per image

```python
def hex_to_color_name(hex_color, distance_threshold=100)
```

- Converts hex color codes to human-readable color names
- Uses Euclidean distance to find closest color
- Supports 12 standard fabric colors:
  - Red, Blue, Green, Yellow
  - Black, White, Gray
  - Pink, Purple, Orange
  - Brown, Beige
- Falls back to "Other" if no match within threshold

```python
def rgb_to_hex(rgb_tuple)
```

- Simple RGB → Hex converter
- Used internally by extract_main_colors

```python
def save_image(file, upload_folder, user_id)
```

- Saves uploaded image with security validation
- Organizes files by user_id: `uploads/user_id/YYYYMMDD_HHMMSS_filename.ext`
- Returns filename and full filepath for storage

#### Fabric Routes (`fabrics_routes.py`)

REST API endpoints for fabric CRUD operations.

**POST /api/fabrics** (Create)

```
Request:
  - Content-Type: multipart/form-data
  - image: File (required, max 5MB, allowed: png/jpg/jpeg/gif/webp)
  - quantite: number (required, > 0)
  - materiel: string (optional)
  - prix: number (optional)
  - description: string (optional)

Response (201):
  {
    "message": "Fabric created successfully",
    "fabric": {
      "_id": "...",
      "image": "filename.jpg",
      "color": ["Red", "Blue", "Yellow", ...],
      "quantite": 10,
      "materiel": "Cotton",
      "prix": 25.50,
      "description": "...",
      "created_at": "ISO datetime"
    },
    "colors": ["Red", "Blue", "Yellow", ...]
  }
```

**GET /api/fabrics** (List all for user)

```
Returns array of fabric objects with extracted colors
```

**PUT /api/fabrics/<id>** (Update)

```
Accepts multipart/form-data
If new image provided, colors are re-extracted
Other fields updated from form data
```

**DELETE /api/fabrics/<id>** (Delete)

```
Removes fabric record (image file remains for now)
```

**GET /api/images/<filename>** (Serve Images)

```
Returns image as base64-encoded data URL
Response:
  {
    "image": "data:image/jpeg;base64,...",
    "mime_type": "image/jpeg"
  }

Security:
- Validates file path is within upload folder
- Prevents directory traversal attacks
- Returns 404 if file doesn't exist
```

### 3. Data Flow

```
User Upload
    ↓
Frontend: Image selected + preview shown
    ↓
Frontend: Form submitted as multipart/form-data
    ↓
Backend: File validation (size, extension, presence)
    ↓
Backend: save_image() → File saved to uploads/user_id/
    ↓
Backend: extract_main_colors() → Image processed
    ↓
    ├→ Load image (PIL)
    ├→ Resize to 100x100
    ├→ KMeans clustering (k=5)
    ├→ Extract cluster centers
    ├→ Convert RGB → Hex → Color name
    └→ Return [Color1, Color2, Color3, Color4, Color5]
    ↓
Backend: Store in MongoDB
    {
      user_id: "...",
      image: "filename.jpg",
      color: ["Red", "Blue", "Yellow", "Black", "White"],
      ... other fields
    }
    ↓
Frontend: Receive response with colors
    ↓
Frontend: On page load, fetch all images via /api/images/<filename>
    ↓
Frontend: Display image thumbnails + color tags in table
```

## Algorithm Details

### KMeans Color Clustering

- **Library**: scikit-learn
- **Why KMeans**: Fast, simple, effective for dominant color extraction
- **Parameters**:
  - n_clusters=5 (find 5 main colors)
  - Algorithm finds color centroids in RGB space
  - Frequencies sorted to get most prominent colors first

### Color Distance Calculation

- Uses Euclidean distance in RGB space
- Distance = sqrt((R1-R2)² + (G1-G2)² + (B1-B2)²)
- Threshold of 100 for matching (0-255 range)
- If distance > 100 from all known colors → "Other"

### Color Names Supported

1. **Red**: RGB(255,0,0) - Pure red
2. **Blue**: RGB(0,0,255) - Pure blue
3. **Green**: RGB(0,255,0) - Pure green
4. **Yellow**: RGB(255,255,0) - Yellow
5. **Black**: RGB(0,0,0) - Black
6. **White**: RGB(255,255,255) - White
7. **Gray**: RGB(128,128,128) - Neutral gray
8. **Pink**: RGB(255,192,203) - Light pink
9. **Purple**: RGB(128,0,128) - Purple
10. **Orange**: RGB(255,165,0) - Orange
11. **Brown**: RGB(165,42,42) - Brown
12. **Beige**: RGB(245,245,220) - Beige

## File Organization

```
ProjetCTR/
├── back-end/Fornisseur/
│   ├── color_extractor.py          NEW - Color extraction module
│   ├── fabrics_routes.py           MODIFIED - Added image endpoints
│   ├── app.py
│   ├── auth.py
│   ├── db.py
│   ├── requirements.txt            MODIFIED - Added Pillow, scikit-learn
│   └── uploads/                    NEW - Image storage directory
│       └── {user_id}/
│           └── YYYYMMDD_HHMMSS_{filename}.ext
│
└── frontend/src/Pages/
    ├── Dashboard.jsx               MODIFIED - Image upload + display
    └── Dashboard.css               MODIFIED - Image styling
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd back-end/Fornisseur
pip install -r requirements.txt
```

Required packages:

- Pillow: Image processing
- scikit-learn: KMeans clustering
- Flask, werkzeug: Already installed

### 2. Create Uploads Directory

```bash
mkdir -p uploads
```

(Automatically created on first upload if using save_image())

### 3. Start Backend

```bash
python app.py
```

### 4. Start Frontend

```bash
cd frontend
npm run dev
```

## Testing

Run the color extraction test suite:

```bash
python test_color_extraction.py
```

Expected output:

- ✓ RGB to Hex conversion tests pass
- ✓ Color mapping tests pass
- ✓ Module ready for use

## Error Handling

### Frontend

- 415 Error: Now fixed - backend accepts multipart/form-data
- 400 Errors: File validation (size, extension)
- 401 Errors: Token expired
- Image loading: Shows "Loading..." → image when ready

### Backend

- **400**: Missing/invalid file
- **401**: Invalid/expired token
- **404**: Fabric or image not found
- **500**: Server errors during processing
- **Security**: Path traversal protection on /api/images endpoint

## Performance Considerations

1. **Image Resizing**: 100x100 prevents slow processing
2. **KMeans Parameters**: k=5 balances accuracy and speed
3. **Async**: Frontend fetches images in parallel
4. **File Size**: 5MB limit prevents resource exhaustion
5. **Color Distance**: Pre-computed distance threshold

## Future Enhancements

1. **Image Cleanup**: Delete old images when fabric updated
2. **Caching**: Cache extracted colors server-side
3. **ML Model**: Train custom color classifier
4. **Image Optimization**: Compress images to JPEG
5. **Batch Processing**: Handle multiple uploads
6. **Analytics**: Track common fabric colors
7. **Sorting**: Filter/sort by dominant colors
8. **Edit Images**: Change extracted colors manually

## Testing with Sample Images

To test with actual fabric images:

1. Prepare fabric images (JPG/PNG format)
2. Upload through Dashboard UI
3. Verify colors extracted correctly
4. Check MongoDB for color arrays
5. Verify images stored in uploads/{user_id}/ directory

## Troubleshooting

**Colors not extraction correctly**:

- Verify image has clear dominant colors
- Check KMeans parameters in color_extractor.py
- Adjust distance_threshold if needed

**Images not displaying**:

- Check uploads folder exists
- Verify file path in response contains filename
- Check backend /api/images endpoint accessible

**Permission errors**:

- Ensure uploads folder writable
- Check user_id correctly passed
- Verify filesystem permissions

## References

- Pillow (PIL): https://python-pillow.org/
- scikit-learn KMeans: https://scikit-learn.org/stable/modules/generated/sklearn.cluster.KMeans.html
- RGB Color Space: https://en.wikipedia.org/wiki/RGB_color_model
- Base64 Encoding: https://en.wikipedia.org/wiki/Base64
