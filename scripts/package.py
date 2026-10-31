"""Generate separate Firefox and Chrome unpacked-extension ZIPs (no credentials)."""
import json
import sys
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
output = Path(sys.argv[1]) if len(sys.argv) > 1 else root / "dist"
output.mkdir(parents=True, exist_ok=True)
for browser in ("firefox", "chrome"):
    manifest = json.loads((root / "ai-platform-poc/manifest.json").read_text())
    if browser == "chrome":
        manifest["background"] = {"service_worker": "service-worker.js"}
    with ZipFile(output / f"extensaoGetCookie-v1.3.0-{browser}.zip", "w", ZIP_DEFLATED) as archive:
        for source in sorted((root / "ai-platform-poc").glob("*.js")):
            archive.write(source, source.name)
        archive.writestr("manifest.json", json.dumps(manifest, indent=2))
        if browser == "chrome":
            archive.writestr("service-worker.js", "importScripts('gemini.js', 'vyral.js', 'leonardo.js', 'background.js');\n")
        for example in root.glob("*-session.example.json"):
            archive.write(example, example.name)
        archive.write(root / "README.md", "README.md")
