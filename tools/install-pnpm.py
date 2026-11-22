"""Install the pinned pnpm native CLI for this glibc image. No package scripts run."""
import base64
import hashlib
import io
import json
import platform
import re
import tarfile
import urllib.request
from pathlib import Path


def verified_archive(url, integrity):
    cache = Path("archives") / base64.b64decode(integrity, validate=True).hex()
    limit = 100 * 1024 * 1024
    if cache.is_file():
        with cache.open("rb") as stream:
            data = stream.read(limit + 1)
    else:
        with urllib.request.urlopen(url, timeout=120) as response:
            if response.geturl() != url:
                raise ValueError("Unexpected pnpm download origin: " + response.geturl())
            data = response.read(limit + 1)
    digest = base64.b64encode(hashlib.sha512(data).digest()).decode("ascii")
    if len(data) > limit or digest != integrity:
        raise ValueError("Unverified pnpm archive: " + url)
    if not cache.exists():
        temporary = cache.with_suffix(".tmp")
        temporary.write_bytes(data)
        temporary.replace(cache)
    return tarfile.open(fileobj=io.BytesIO(data), mode="r:gz")


def member(archive, name):
    entry = archive.getmember(name)
    if not entry.isfile() or entry.size > 150 * 1024 * 1024:
        raise ValueError("Expected a regular package file: " + name)
    return archive.extractfile(entry).read()


def install():
    pin = json.loads(Path("package.json").read_text())["packageManager"]
    version, integrity = re.fullmatch(r"pnpm@(\d+\.\d+\.\d+)\+sha512\.([A-Za-z0-9+/]{86}==)", pin).groups()
    arch = {"x86_64": "x64", "aarch64": "arm64"}[platform.machine()]
    name = "@pnpm/exe.linux-" + arch
    with verified_archive(f"https://registry.npmjs.org/pnpm/-/pnpm-{version}.tgz", integrity) as package:
        manifest = json.loads(member(package, "package/package.json"))
        if (manifest["name"], manifest["version"], manifest["optionalDependencies"][name]) != ("pnpm", version, version):
            raise ValueError("Unexpected pnpm package or platform pin")
    # Read only the named package's SRI in the pnpm toolchain document, before the product lock.
    lock = Path("pnpm-lock.yaml").read_text().split("\n---\n", 1)[0]
    key = re.escape(f"'{name}@{version}':")
    match = re.search(rf"^  {key}\n    resolution: \{{integrity: sha512-([A-Za-z0-9+/]{{86}}==)\}}$", lock, re.M)
    if not match:
        raise ValueError(f"Missing integrity for {name}@{version} in the pnpm lock")
    basename = name.split("/")[1]
    with verified_archive(f"https://registry.npmjs.org/{name}/-/{basename}-{version}.tgz", match[1]) as package:
        for notice in ("LICENSE", "THIRD-PARTY-NOTICES.md"):
            Path(notice).write_bytes(member(package, "package/" + notice))
        binary = member(package, "package/pnpm")
        if not binary.startswith(b"\x7fELF"):
            raise ValueError("Expected the Linux pnpm executable")
    Path("pnpm").write_bytes(binary)
    Path("pnpm").chmod(0o755)


if __name__ == "__main__":
    install()
