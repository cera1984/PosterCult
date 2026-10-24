"""Rigenera il catalogo privato e le miniature senza modificare gli originali."""

import hashlib
import json
import re
import shutil
from pathlib import Path

from PIL import Image, ImageOps


HERE = Path(__file__).resolve().parent
ARCHIVE = HERE.parent
THUMBS = HERE / "thumbs"
ORIGINALS = HERE / "assets" / "originals"
EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".avif"}
DISPLAY_GROUPS = {
    "leon": "Léon",
    "sopranos": "I Soprano",
    "others": "Altri film",
}


def film_title(parts, stem):
    if len(parts) >= 3:
        return parts[-2]
    if len(parts) == 2 and parts[0].lower() not in {"others", "marvel"}:
        return DISPLAY_GROUPS.get(parts[0].lower(), parts[0])
    return re.sub(r"[\s_-]*\d+$", "", stem).strip() or stem


def main():
    THUMBS.mkdir(exist_ok=True)
    ORIGINALS.mkdir(parents=True, exist_ok=True)
    entries = []
    paths = sorted(
        (p for p in ARCHIVE.rglob("*") if p.is_file() and p.suffix.lower() in EXTENSIONS and HERE not in p.parents),
        key=lambda p: str(p).casefold(),
    )
    for path in paths:
        rel = path.relative_to(ARCHIVE)
        key = rel.as_posix()
        thumb_name = hashlib.sha256(key.encode("utf-8")).hexdigest()[:20] + ".webp"
        thumb_path = THUMBS / thumb_name
        try:
            with Image.open(path) as image:
                width, height = ImageOps.exif_transpose(image).size
                if not thumb_path.exists() or thumb_path.stat().st_mtime < path.stat().st_mtime:
                    preview = ImageOps.exif_transpose(image)
                    preview.thumbnail((540, 760), Image.Resampling.LANCZOS)
                    preview.convert("RGB").save(thumb_path, "WEBP", quality=80, method=5)
            online_path = ORIGINALS / rel
            online_path.parent.mkdir(parents=True, exist_ok=True)
            if not online_path.exists() or online_path.stat().st_mtime < path.stat().st_mtime:
                shutil.copy2(path, online_path)
        except (OSError, ValueError) as exc:
            print(f"Saltata {rel}: {exc}")
            continue

        parts = rel.parts
        group_key = parts[0].lower()
        if group_key == "others":
            subgroup = parts[1] if len(parts) > 1 else "Altri"
            # Per cartelle come others/ITALIANI/DARIO ARGENTO/film, la sezione
            # mostrata all'utente è ITALIANI / DARIO ARGENTO.
            if len(parts) > 3:
                subgroup = f"{parts[1]} / {parts[2]}"
        else:
            subgroup = parts[1] if len(parts) > 2 else ""
        entries.append({
            "id": thumb_name[:-5],
            "film": film_title(parts, path.stem),
            "group": DISPLAY_GROUPS.get(parts[0].lower(), parts[0]),
            "subgroup": subgroup,
            "filename": path.name,
            "folder": " / ".join(parts[:-1]),
            "original": "assets/originals/" + "/".join(parts),
            "thumbnail": "thumbs/" + thumb_name,
            "width": width,
            "height": height,
        })

    # Il JS è un file locale: funziona anche aprendo index.html senza server.
    data = "window.POSTERZ_IMAGES = " + json.dumps(entries, ensure_ascii=False, separators=(",", ":")) + ";\n"
    (HERE / "gallery-data.js").write_text(data, encoding="utf-8")
    print(f"Catalogate {len(entries)} immagini; miniature in {THUMBS}")


if __name__ == "__main__":
    main()
