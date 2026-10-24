"""Render a 20-second promotional montage from the exported campaign frames.

This is a web/YouTube promotional video, not a native Apple App Preview.
Usage: python scripts/store/render_promo.py --ffmpeg /path/to/ffmpeg
"""
import argparse
from pathlib import Path
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[2] / "public/app-store/2026-kit/es"


def render(ffmpeg, frames, output):
    if len(frames) != 4 or not all(frame.is_file() for frame in frames):
        raise ValueError("Export all four campaign frames before rendering.")
    command = [ffmpeg, "-y", "-hide_banner", "-loglevel", "error"]
    filters = []
    for index, frame in enumerate(frames):
        command += ["-loop", "1", "-t", "5", "-i", str(frame)]
        filters.append(
            f"[{index}:v]fps=30,format=yuv420p,"
            f"fade=t=in:st=0:d=0.25,fade=t=out:st=4.75:d=0.25[v{index}]"
        )
    filters.append("[v0][v1][v2][v3]concat=n=4:v=1:a=0[video]")
    command += ["-filter_complex", ";".join(filters), "-map", "[video]", "-an",
                "-c:v", "libx264", "-preset", "fast", "-crf", "22",
                "-movflags", "+faststart", "-t", "20", str(output)]
    subprocess.run(command, check=True)
    print(f"Rendered: {output.name}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ffmpeg", default=shutil.which("ffmpeg"))
    args = parser.parse_args()
    if not args.ffmpeg:
        parser.error("Provide --ffmpeg with the installed FFmpeg executable.")
    render(args.ffmpeg, [ROOT / "video" / f"{index:02d}-escena.png" for index in range(1, 5)],
           ROOT / "03-deamap-presentacion.mp4")
    render(args.ffmpeg, [ROOT / "android" / f"{index:02d}-descubrimiento.png" for index in range(1, 5)],
           ROOT / "04-deamap-vertical.mp4")


if __name__ == "__main__":
    main()
