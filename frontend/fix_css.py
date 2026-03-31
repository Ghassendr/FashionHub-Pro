import sys
sys.exit(0)
import os
import re

base_dir = r"c:\Users\lasis\Desktop\projet E commrce\ProjetCTR\frontend\src\actors\Fournisseur"

def fix_css_file(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Remove *, *::before, *::after
    content = re.sub(r'\*,\s*\*::before,\s*\*::after\s*\{[^}]+\}', '', content)
    
    # 2. Remove body { ... }
    # Let's extract body content to add it to .dashboard / .settings-container
    body_match = re.search(r'body\s*\{([^}]+)\}', content)
    body_styles = body_match.group(1) if body_match else ""
    content = re.sub(r'body\s*\{[^}]+\}', '', content)
    
    # 3. Rename classes
    replacements = {
        r'\.btn-primary': '.f-btn-primary',
        r'\.btn-secondary': '.f-btn-secondary',
        r'\.alert\b': '.f-alert',
        r'\.alert-error': '.f-alert-error',
        r'\.alert-success': '.f-alert-success',
        r'\.alert-close': '.f-alert-close'
    }
    
    for old, new in replacements.items():
        content = re.sub(old, new, content)
        
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)
    return body_styles

def fix_jsx_file(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()

    # Rename classes in JSX
    replacements = {
        r'"btn-primary"': '"f-btn-primary"',
        r'"btn-secondary"': '"f-btn-secondary"',
        r'"alert alert-error"': '"f-alert f-alert-error"',
        r'"alert alert-success"': '"f-alert f-alert-success"',
        r'"alert-close"': '"f-alert-close"'
    }
    for old, new in replacements.items():
        content = re.sub(old, new, content)
        
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)

# Fix Dashboard
db_css = os.path.join(base_dir, "Dashboard.css")
db_jsx = os.path.join(base_dir, "Dashboard.jsx")

db_body_styles = fix_css_file(db_css)
fix_jsx_file(db_jsx)

# Inject body styles into .dashboard
with open(db_css, 'r', encoding='utf-8') as f:
    db_css_content = f.read()

if db_body_styles:
    db_css_content = re.sub(r'\.dashboard\s*\{', '.dashboard {\n' + db_body_styles, db_css_content)
    with open(db_css, 'w', encoding='utf-8') as f:
        f.write(db_css_content)

# Fix Settings
set_css = os.path.join(base_dir, "Settings.css")
set_jsx = os.path.join(base_dir, "Settings.jsx")

set_body_styles = fix_css_file(set_css)
fix_jsx_file(set_jsx)

if set_body_styles:
    with open(set_css, 'r', encoding='utf-8') as f:
        set_css_content = f.read()
    set_css_content = re.sub(r'\.settings-container\s*\{', '.settings-container {\n' + set_body_styles, set_css_content)
    with open(set_css, 'w', encoding='utf-8') as f:
        f.write(set_css_content)

print("CSS and JSX files fixed!")
