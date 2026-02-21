import os
import re
import glob

modules = [
    "anatomical_mesh_builder", "app", "body_processor", "dressrecon_extractor",
    "fashion_intelligence", "hmr_mamba_estimator", "ik_tpose_solver", "inpaint_human", 
    "layergs_renderer", "morphology_analyzer", "pipeline_config", "sequential_pipeline", 
    "shapy_measurer", "smpl_fitter", "smpl_landmark_fitter", "smpl_reconstructor", 
    "smplify_x_fitter", "video_overlay", "video_preprocessor", "visualization", "checkpoint_manager"
]

files = glob.glob(r'C:\Users\ghass\Documents\GitHub\ProjetCTR\backend\3d_model_body_measurements\*.py')

def fix_imports():
    for fpath in files:
        if os.path.basename(fpath) == 'app.py':
            continue # app.py is legacy flask, might not need fixing but let's skip to be safe, or just fix it.
            
        with open(fpath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        modified = content
        for mod in modules:
            # Fix "from X import ...."
            # Careful with boundaries
            modified = re.sub(r'(\n|^)from ' + mod + r' import ', r'\1from .' + mod + r' import ', modified)
            modified = re.sub(r'(\s+)from ' + mod + r' import ', r'\1from .' + mod + r' import ', modified)
            
            # Fix "import X" (multiline safe)
            modified = re.sub(r'(\n|^)import ' + mod + r'(\s+|$)', r'\1from . import ' + mod + r'\2', modified)
            modified = re.sub(r'(\s+)import ' + mod + r'(\s+|$)', r'\1from . import ' + mod + r'\2', modified)
            
        if modified != content:
            with open(fpath, 'w', encoding='utf-8') as f:
                f.write(modified)
            print(f"Fixed imports in: {os.path.basename(fpath)}")

if __name__ == '__main__':
    fix_imports()
