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
    "tarantino": "Tarantino",
    "kubrick": "Kubrick",
    "carpenter": "Carpenter",
    "marvel": "Marvel",
    "disney": "Disney",
}


def clean_name(name):
    return re.sub(r"[\s_-]+\d+$", "", name).replace("_", " ").title()


def get_group_and_subgroup(parts):
    # parts: ad es. ('CARPENTER', 'ESSI VIVONO', 'tl1.jpg')
    # oppure ('others', 'ITALIANI', 'DARIO ARGENTO', 'SUSPIRIA', 'img.webp')
    # oppure ('others', 'SCARFACE', 'img.webp')
    top = parts[0].lower()
    if top == "others":
        if len(parts) > 2:
            group = parts[1].replace("_", " ").title()
            subgroup = parts[2].replace("_", " ").title() if len(parts) > 3 else ""
        elif len(parts) == 2:
            group = parts[1].replace("_", " ").title()
            subgroup = ""
        else:
            group = "Collezione"
            subgroup = ""
    else:
        group = DISPLAY_GROUPS.get(top, parts[0].replace("_", " ").title())
        subgroup = parts[1].replace("_", " ").title() if len(parts) > 2 else ""
    return group, subgroup


def film_title(parts, stem):
    top = parts[0].lower()
    if top == "others":
        if len(parts) >= 4:
            return parts[-2].replace("_", " ").title()
        elif len(parts) == 3:
            return parts[1].replace("_", " ").title()
        elif len(parts) == 2:
            return parts[1].replace("_", " ").title()
    else:
        if len(parts) >= 3:
            return parts[-2].replace("_", " ").title()
        elif len(parts) == 2:
            return parts[0].replace("_", " ").title()
    return clean_name(stem)


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
        group, subgroup = get_group_and_subgroup(parts)
        entries.append({
            "id": thumb_name[:-5],
            "film": film_title(parts, path.stem),
            "group": group,
            "subgroup": subgroup,
            "filename": path.name,
            "folder": " / ".join(parts[:-1]),
            "original": online_path.relative_to(output).as_posix(),
            "thumbnail": "thumbs/" + thumb_name,
            "width": width,
            "height": height,
        })

    data = "window.POSTERZ_IMAGES = " + json.dumps(entries, ensure_ascii=False, separators=(",", ":")) + ";\n"
    (output / "gallery-data.js").write_text(data, encoding="utf-8")
    print(f"Catalogate {len(entries)} immagini; miniature in {thumbs}")


if __name__ == "__main__":
    main()
