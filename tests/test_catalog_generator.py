import tempfile
import unittest
from pathlib import Path
from generate_catalog import canonical_destination


class CatalogPathsTest(unittest.TestCase):
    def test_existing_output_spelling_is_kept_for_directories_and_files(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            actual = root / "sopranos" / "sopranos2.webp"
            actual.parent.mkdir()
            actual.write_bytes(b"test")
            result = canonical_destination(root, Path("SOPRANOS") / "SOPRANOS2.WEBP")
            self.assertEqual(result.as_posix(), actual.as_posix())

    def test_new_files_reuse_existing_parent_spelling(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "tarantino" / "jackie brown").mkdir(parents=True)
            result = canonical_destination(root, Path("TARANTINO/JACKIE BROWN/NEW.webp"))
            self.assertEqual(result.relative_to(root).as_posix(), "tarantino/jackie brown/NEW.webp")


if __name__ == "__main__":
    unittest.main()
