import os

SEARCH_TERMS = ["railway.app", "schooltransport-production", "mytrack-production"]
ROOT_DIR = "src"
EXTENSIONS = (".ts", ".tsx", ".js", ".jsx")

def search_files():
    matches = []
    for dirpath, _, filenames in os.walk(ROOT_DIR):
        for filename in filenames:
            if filename.endswith(EXTENSIONS):
                filepath = os.path.join(dirpath, filename)
                try:
                    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                        for lineno, line in enumerate(f, start=1):
                            for term in SEARCH_TERMS:
                                if term in line:
                                    matches.append((filepath, lineno, line.strip()))
                except Exception:
                    pass
    return matches

if __name__ == "__main__":
    results = search_files()
    if not results:
        print("No references to old Railway URLs found in src/.")
    else:
        print(f"Found {len(results)} matches:\n")
        for filepath, lineno, line in results:
            print(f"{filepath}:{lineno}: {line}")

    if os.path.exists(".env"):
        print("\nChecking .env:")
        with open(".env", "r", encoding="utf-8", errors="ignore") as f:
            for lineno, line in enumerate(f, start=1):
                if "railway.app" in line:
                    print(f".env:{lineno}: {line.strip()}")
