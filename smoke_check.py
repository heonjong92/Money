# [Codex] 정적 PWA의 핵심 파일 연결과 필수 요소 존재 여부를 빠르게 확인하는 스모크 테스트입니다.
from __future__ import annotations

import json
from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parent
INDEX_PATH = ROOT / "index.html"
MANIFEST_PATH = ROOT / "manifest.webmanifest"
REQUIRED_FILES = [
    ROOT / "styles.css",
    ROOT / "app.js",
    ROOT / "sw.js",
    ROOT / "assets" / "icon.svg",
    ROOT / "assets" / "icon-180.png",
    ROOT / "assets" / "icon-192.png",
    ROOT / "assets" / "icon-512.png",
]
REQUIRED_IDS = {
    "summary-month",
    "entry-form",
    "calendar-grid",
    "category-breakdown",
    "transaction-list",
    "export-button",
    "import-button",
    "reset-button",
    "toast",
}


class IdCollector(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.ids: set[str] = set()

    def handle_starttag(self, _tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attributes = dict(attrs)
        element_id = attributes.get("id")
        if element_id:
            self.ids.add(element_id)


def main() -> None:
    missing_files = [str(path.relative_to(ROOT)) for path in REQUIRED_FILES if not path.exists()]
    if missing_files:
        raise SystemExit(f"Missing required files: {', '.join(missing_files)}")

    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    icon_sources = {icon["src"] for icon in manifest.get("icons", [])}
    expected_icon_sources = {"assets/icon-192.png", "assets/icon-512.png"}
    if icon_sources != expected_icon_sources:
        raise SystemExit(f"Unexpected manifest icons: {sorted(icon_sources)}")

    parser = IdCollector()
    parser.feed(INDEX_PATH.read_text(encoding="utf-8"))
    missing_ids = sorted(REQUIRED_IDS - parser.ids)
    if missing_ids:
        raise SystemExit(f"Missing required element ids: {', '.join(missing_ids)}")

    print("smoke_check: ok")


if __name__ == "__main__":
    main()
