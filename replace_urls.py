import os

REPLACEMENTS = {
    "https://schooltransport-production.up.railway.app": "https://tmk-api.joshpitah.co.ke",
    "https://mytrack-production.up.railway.app": "https://tmk-api.joshpitah.co.ke",
}

ROOT_DIR = "src"
EXTENSIONS = (".ts", ".tsx", ".js", ".jsx")

def replace_in_file(filepath):
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()
    original = content
    for old, new in REPLACEMENTS.items():
        content = content.replace(old, new)
    if content != original:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        return True
    return False

changed_files = []
for dirpath, _, filenames in os.walk(ROOT_DIR):
    for filename in filenames:
        if filename.endswith(EXTENSIONS):
            filepath = os.path.join(dirpath, filename)
            if replace_in_file(filepath):
                changed_files.append(filepath)

print(f"Updated {len(changed_files)} files:")
for f in changed_files:
    print(f" - {f}")
