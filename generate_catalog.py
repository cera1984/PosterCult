"""Rigenera il catalogo privato e le miniature senza modificare gli originali."""

import hashlib
import json
import re
import shutil
import argparse
from pathlib import Path

from PIL import Image, ImageOps


EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".avif"}
IGNORED_SOURCE_DIRS = {".git", "site", "sito", "assets", "thumbs"}
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


def canonical_destination(root, relative):
    """Reuse the exact spelling of existing output files, also on Windows."""
    current = root
    for part in relative.parts:
        children = list(current.iterdir()) if current.is_dir() else []
        exact = next((child for child in children if child.name == part), None)
        matches = [child for child in children if child.name.casefold() == part.casefold()]
        if exact is not None:
            current = exact
        elif len(matches) == 1:
            current = matches[0]
        elif len(matches) > 1:
            raise ValueError(f"Nomi ambigui in {current}: {part}")
        else:
            current = current / part
    return current


def main():
    parser = argparse.ArgumentParser(description="Sincronizza l'archivio poster nel sito locale.")
    parser.add_argument("--archive", type=Path, default=Path(r"E:\POSTERZ"), help="Cartella sorgente dell'archivio")
    parser.add_argument("--output", type=Path, default=Path(__file__).resolve().parent, help="Radice del repository del sito")
    args = parser.parse_args()
    archive = args.archive.resolve()
    output = args.output.resolve()
    thumbs = output / "thumbs"
    originals = output / "assets" / "originals"
    if not archive.is_dir():
        raise SystemExit(f"Archivio non trovato: {archive}")
    thumbs.mkdir(exist_ok=True)
    originals.mkdir(parents=True, exist_ok=True)
    entries = []
    paths = sorted(
        (p for p in archive.rglob("*") if p.is_file() and p.suffix.lower() in EXTENSIONS and not any(part.lower() in IGNORED_SOURCE_DIRS for part in p.relative_to(archive).parts[:-1])),
        key=lambda p: str(p).casefold(),
    )
    for path in paths:
        rel = path.relative_to(archive)
        key = rel.as_posix()
        thumb_name = hashlib.sha256(key.encode("utf-8")).hexdigest()[:20] + ".webp"
        thumb_path = thumbs / thumb_name
        try:
            with Image.open(path) as image:
                width, height = ImageOps.exif_transpose(image).size
                if not thumb_path.exists() or thumb_path.stat().st_mtime < path.stat().st_mtime:
                    preview = ImageOps.exif_transpose(image)
                    preview.thumbnail((540, 760), Image.Resampling.LANCZOS)
                    preview.convert("RGB").save(thumb_path, "WEBP", quality=80, method=5)
            online_path = canonical_destination(originals, rel)
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
            "original": online_path.relative_to(output).as_posix(),
            "thumbnail": "thumbs/" + thumb_name,
            "width": width,
            "height": height,
        })

    # Il JS è un file locale: funziona anche aprendo index.html senza server.
    data = "window.POSTERZ_IMAGES = " + json.dumps(entries, ensure_ascii=False, separators=(",", ":")) + ";\n"
    (output / "gallery-data.js").write_text(data, encoding="utf-8")
    print(f"Catalogate {len(entries)} immagini; miniature in {thumbs}")


if __name__ == "__main__":
    main()
