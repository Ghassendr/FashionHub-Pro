import glob
import re
import os

files = glob.glob(r'C:\Users\ghass\Documents\GitHub\ProjetCTR\backend\3d_model_body_measurements\*.py')

def fix_model_paths():
    for fpath in files:
        with open(fpath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Find: os.path.abspath('models/something.task') or os.path.abspath("models/something.task")
        # Replace: os.path.join(os.path.abspath(os.path.dirname(__file__)), 'models', 'something.task')
        
        modified = re.sub(
            r"os\.path\.abspath\(['\"]models/([^'\"]+)['\"]\)",
            r"os.path.join(os.path.abspath(os.path.dirname(__file__)), 'models', '\1')",
            content
        )
        
        if modified != content:
            with open(fpath, 'w', encoding='utf-8') as f:
                f.write(modified)
            print(f"Fixed model paths in: {os.path.basename(fpath)}")

if __name__ == '__main__':
    fix_model_paths()
