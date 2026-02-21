import sys, os
sys.path.append(os.path.abspath('backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
import django
django.setup()

import cv2
import numpy as np
from actors.client.ml_pipeline.sequential_pipeline import SequentialPipeline

uploads_dir = os.path.abspath('backend/media/uploads')
videos = [f for f in os.listdir(uploads_dir) if f.endswith('.mp4')]

print(f"Found videos: {videos}")

if not videos:
    print('No test videos found')
else:
    test_video = os.path.join(uploads_dir, videos[-1])
    print(f'Testing with {test_video}')
    
    pipeline = SequentialPipeline(quality='fast')
    
    try:
        result = pipeline.run(
            video_path=test_video,
            output_dir=os.path.abspath('backend/media/results/test_run'),
            height_cm=175.0,
            weight_kg=70.0,
            age=30,
            gender='men'
        )
        print('\n--- RESULT ---')
        print(f"STATUS: {result.get('status')}")
        print(f"MESH PATH: {result.get('mesh_path')}")
        
        meas = result.get('measurements', {})
        print(f"MEASUREMENTS KEYS: {list(meas.keys())}")
        
        if 'basics' in meas:
            for b in meas['basics']:
                print(f" - {b.get('name')}: {b.get('value_cm')} cm")
                
    except Exception as e:
        print(f"PIPELINE CRASHED: {e}")
        import traceback
        traceback.print_exc()
