#!/usr/bin/env python3
"""Build actual-size animated QA previews for Goro's directional walk cycles."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


STAGE_SIZE = (256, 224)
DRAW_SIZE = (55, 100)
DISPLAY_SCALE = 2


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--duration",
        type=int,
        default=120,
        help=(
            "Milliseconds between consecutive foot-contact poses; passing "
            "frames divide this interval evenly (default: 120)"
        ),
    )
    return parser.parse_args()


def floor_stage() -> Image.Image:
    stage = Image.new("RGBA", STAGE_SIZE, (46, 54, 68, 255))
    draw = ImageDraw.Draw(stage)

    for row, top in enumerate(range(0, STAGE_SIZE[1], 16)):
        for column, left in enumerate(range(0, STAGE_SIZE[0], 32)):
            offset = 16 if row % 2 else 0
            x = left - offset
            shade = 5 if (row + column) % 3 == 0 else 0
            fill = (50 + shade, 59 + shade, 74 + shade, 255)
            draw.rectangle((x, top, x + 30, top + 14), fill=fill)
            draw.line((x, top + 15, x + 31, top + 15), fill=(32, 39, 50, 255))
            draw.line((x + 31, top, x + 31, top + 15), fill=(38, 45, 57, 255))

    shadow_layer = Image.new("RGBA", STAGE_SIZE, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow_layer)
    shadow_draw.ellipse((106, 145, 150, 163), fill=(7, 10, 16, 110))
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(2))
    return Image.alpha_composite(stage, shadow_layer)


def render_frame(asset_path: Path) -> Image.Image:
    stage = floor_stage()
    character = Image.open(asset_path).convert("RGBA")
    character = character.resize(DRAW_SIZE, Image.Resampling.LANCZOS)
    left = (STAGE_SIZE[0] - DRAW_SIZE[0]) // 2
    top = 62
    stage.alpha_composite(character, (left, top))
    return stage.resize(
        (STAGE_SIZE[0] * DISPLAY_SCALE, STAGE_SIZE[1] * DISPLAY_SCALE),
        Image.Resampling.NEAREST,
    ).convert("RGB")


def save_cycle(
    paths: list[Path], output: Path, duration: int | list[int]
) -> None:
    frames = [render_frame(path) for path in paths]
    output.parent.mkdir(parents=True, exist_ok=True)
    frames[0].save(
        output,
        format="GIF",
        save_all=True,
        append_images=frames[1:],
        duration=duration,
        loop=0,
        optimize=False,
        disposal=2,
    )


def main() -> None:
    args = parse_args()
    if args.duration <= 0:
        raise ValueError("--duration must be greater than zero")

    root = Path(__file__).resolve().parents[1]
    runtime = root / "assets" / "actors" / "goro" / "runtime"
    output_dir = root / "docs" / "planning" / "prot3"

    right_forward = runtime / "goro-walk-down-right-foot-forward-v1.webp"
    idle = runtime / "goro-idle-down-v3.webp"
    raw_left_forward = runtime / "goro-walk-down-left-foot-forward-v1.webp"
    relit_left_forward = runtime / "goro-walk-down-left-foot-forward-relit-v1.webp"

    save_cycle(
        [right_forward, idle, raw_left_forward, idle],
        output_dir / "goro-walk-down-raw-flip.gif",
        args.duration,
    )
    save_cycle(
        [right_forward, idle, relit_left_forward, idle],
        output_dir / "goro-walk-down-fixed-light.gif",
        args.duration,
    )
    contact_interval = max(args.duration, 180)
    save_cycle(
        [right_forward, relit_left_forward],
        output_dir / "goro-walk-down-two-phase-fixed-light.gif",
        contact_interval,
    )
    save_cycle(
        [
            idle,
            right_forward,
            relit_left_forward,
            right_forward,
            relit_left_forward,
            right_forward,
            relit_left_forward,
            idle,
        ],
        output_dir / "goro-walk-down-start-walk-stop.gif",
        [600, contact_interval, contact_interval, contact_interval,
         contact_interval, contact_interval, contact_interval, 600],
    )

    directional_cycles = {
        "up": {
            "idle": runtime / "goro-idle-up-v2.webp",
            "contacts": [
                runtime / "goro-walk-up-right-foot-forward-v1.webp",
                runtime / "goro-walk-up-left-foot-forward-relit-v1.webp",
            ],
        },
        "right": {
            "idle": runtime / "goro-idle-right-v1.webp",
            "contacts": [
                runtime / "goro-walk-right-contact-right-leg-left-arm-forward-v3.webp",
                runtime / "goro-walk-right-passing-left-leg-v1.webp",
                runtime / "goro-walk-right-contact-left-leg-right-arm-forward-v3.webp",
                runtime / "goro-walk-right-passing-right-leg-v1.webp",
            ],
        },
        "left": {
            "idle": runtime / "goro-idle-left-relit-v1.webp",
            "contacts": [
                runtime / "goro-walk-left-contact-right-leg-left-arm-forward-relit-v3.webp",
                runtime / "goro-walk-left-passing-left-leg-relit-v1.webp",
                runtime / "goro-walk-left-contact-left-leg-right-arm-forward-relit-v3.webp",
                runtime / "goro-walk-left-passing-right-leg-relit-v1.webp",
            ],
        },
    }

    for direction, cycle in directional_cycles.items():
        contacts = cycle["contacts"]
        idle_frame = cycle["idle"]
        phase_label = "four-phase" if len(contacts) == 4 else "two-phase"
        same_foot_cycle_duration = contact_interval * 2
        frame_duration = round(same_foot_cycle_duration / len(contacts))
        save_cycle(
            contacts,
            output_dir / f"goro-walk-{direction}-{phase_label}-fixed-light.gif",
            frame_duration,
        )
        save_cycle(
            [idle_frame, *contacts, *contacts, *contacts, idle_frame],
            output_dir / f"goro-walk-{direction}-start-walk-stop.gif",
            [600, *([frame_duration] * (len(contacts) * 3)), 600],
        )


if __name__ == "__main__":
    main()
