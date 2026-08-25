#!/usr/bin/env python3
"""Remove a generated green-screen background and preserve antialiased edges.

The generated character art in this project does not contain intentional green
details.  Alpha is therefore estimated from how strongly green dominates the
red and blue channels.  This works with slightly uneven generated green-screen
backgrounds and keeps dark outlines opaque.
"""

from __future__ import annotations

import argparse
import json
from collections import deque
from pathlib import Path

from PIL import Image


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path, help="Source image with a green background")
    parser.add_argument("output", type=Path, help="Destination transparent PNG")
    parser.add_argument(
        "--opaque-excess",
        type=float,
        default=35.0,
        help="Green dominance at or below this value remains fully opaque (default: 35)",
    )
    parser.add_argument(
        "--transparent-excess",
        type=float,
        default=170.0,
        help="Green dominance at or above this value becomes transparent (default: 170)",
    )
    parser.add_argument(
        "--despill",
        type=float,
        default=0.9,
        help="Strength of green-spill reduction on green-dominant pixels, 0..1 (default: 0.9)",
    )
    parser.add_argument(
        "--trim",
        action="store_true",
        help="Crop to the non-transparent bounding box after extraction",
    )
    parser.add_argument(
        "--padding",
        type=int,
        default=0,
        help="Transparent pixels retained around a trimmed image (default: 0)",
    )
    parser.add_argument(
        "--trim-alpha-threshold",
        type=int,
        default=16,
        help="Ignore alpha at or below this value when finding the trim box (default: 16)",
    )
    parser.add_argument(
        "--keep-largest-alpha-component",
        action="store_true",
        help="Remove detached generated particles and retain only the largest alpha-connected subject",
    )
    parser.add_argument(
        "--max-width",
        type=int,
        default=0,
        help="Resize to fit this width while preserving aspect ratio; 0 disables it",
    )
    parser.add_argument(
        "--max-height",
        type=int,
        default=0,
        help="Resize to fit this height while preserving aspect ratio; 0 disables it",
    )
    parser.add_argument(
        "--canvas-width",
        type=int,
        default=0,
        help="Place the result on a transparent canvas of this width; 0 disables it",
    )
    parser.add_argument(
        "--canvas-height",
        type=int,
        default=0,
        help="Place the result on a transparent canvas of this height; 0 disables it",
    )
    parser.add_argument(
        "--flip-x",
        action="store_true",
        help="Flip the extracted result horizontally after trimming and resizing",
    )
    return parser.parse_args()


def smoothstep(value: float) -> float:
    value = max(0.0, min(1.0, value))
    return value * value * (3.0 - 2.0 * value)


def remove_green(
    image: Image.Image,
    opaque_excess: float,
    transparent_excess: float,
    despill: float,
) -> Image.Image:
    if transparent_excess <= opaque_excess:
        raise ValueError("--transparent-excess must be greater than --opaque-excess")
    if not 0.0 <= despill <= 1.0:
        raise ValueError("--despill must be between 0 and 1")

    source = image.convert("RGB")
    output_pixels: list[tuple[int, int, int, int]] = []
    span = transparent_excess - opaque_excess

    pixels = source.get_flattened_data() if hasattr(source, "get_flattened_data") else source.getdata()
    for red, green, blue in pixels:
        green_excess = green - max(red, blue)

        if green_excess <= opaque_excess:
            alpha = 255
        elif green_excess >= transparent_excess:
            alpha = 0
        else:
            background_mix = smoothstep((green_excess - opaque_excess) / span)
            alpha = round(255 * (1.0 - background_mix))

        if alpha == 0:
            output_pixels.append((0, 0, 0, 0))
            continue

        # Generated antialiasing can leave a thin, fully opaque green seam on
        # very dark contours. Despill every green-dominant retained pixel, not
        # only partial-alpha pixels. Pull green toward the red/blue average so
        # a blue rim light does not become cyan after chroma removal. This
        # project has no intentional green in character art.
        if green > max(red, blue):
            neutral_green = (red + blue) / 2
            spill = green - neutral_green
            green = round(green - spill * despill)

        output_pixels.append((red, max(0, min(255, green)), blue, alpha))

    output = Image.new("RGBA", source.size)
    output.putdata(output_pixels)
    return output


def trim_transparent(image: Image.Image, padding: int, alpha_threshold: int) -> Image.Image:
    if padding < 0:
        raise ValueError("--padding must be zero or greater")
    if not 0 <= alpha_threshold <= 254:
        raise ValueError("--trim-alpha-threshold must be between 0 and 254")

    alpha = image.getchannel("A")
    trim_mask = alpha.point(lambda value: 255 if value > alpha_threshold else 0)
    bbox = trim_mask.getbbox()
    if bbox is None:
        raise ValueError("The extracted image is fully transparent")

    left, top, right, bottom = bbox
    left = max(0, left - padding)
    top = max(0, top - padding)
    right = min(image.width, right + padding)
    bottom = min(image.height, bottom + padding)
    return image.crop((left, top, right, bottom))


def keep_largest_alpha_component(image: Image.Image, alpha_threshold: int) -> Image.Image:
    """Remove detached particles while preserving a one-pixel antialias fringe."""
    if not 0 <= alpha_threshold <= 254:
        raise ValueError("--trim-alpha-threshold must be between 0 and 254")

    width, height = image.size
    alpha = image.getchannel("A")
    alpha_data = alpha.get_flattened_data() if hasattr(alpha, "get_flattened_data") else alpha.getdata()
    alpha_values = bytes(alpha_data)
    visited = bytearray(width * height)
    largest: list[int] = []

    for start, value in enumerate(alpha_values):
        if value <= alpha_threshold or visited[start]:
            continue

        visited[start] = 1
        queue = deque([start])
        component: list[int] = []
        while queue:
            index = queue.popleft()
            component.append(index)
            x = index % width
            y = index // width
            for neighbor_y in range(max(0, y - 1), min(height, y + 2)):
                row = neighbor_y * width
                for neighbor_x in range(max(0, x - 1), min(width, x + 2)):
                    neighbor = row + neighbor_x
                    if visited[neighbor] or alpha_values[neighbor] <= alpha_threshold:
                        continue
                    visited[neighbor] = 1
                    queue.append(neighbor)

        if len(component) > len(largest):
            largest = component

    if not largest:
        raise ValueError("No alpha component survived the threshold")

    keep = bytearray(width * height)
    for index in largest:
        x = index % width
        y = index // width
        for neighbor_y in range(max(0, y - 1), min(height, y + 2)):
            row = neighbor_y * width
            for neighbor_x in range(max(0, x - 1), min(width, x + 2)):
                keep[row + neighbor_x] = 1

    image_data = image.get_flattened_data() if hasattr(image, "get_flattened_data") else image.getdata()
    pixels = list(image_data)
    cleaned_pixels = [pixel if keep[index] else (0, 0, 0, 0) for index, pixel in enumerate(pixels)]
    cleaned = Image.new("RGBA", image.size)
    cleaned.putdata(cleaned_pixels)
    return cleaned


def resize_to_fit(image: Image.Image, max_width: int, max_height: int) -> Image.Image:
    if max_width < 0 or max_height < 0:
        raise ValueError("--max-width and --max-height must be zero or greater")
    if max_width == 0 and max_height == 0:
        return image

    width_limit = max_width or image.width
    height_limit = max_height or image.height
    scale = min(width_limit / image.width, height_limit / image.height, 1.0)
    if scale >= 1.0:
        return image

    size = (max(1, round(image.width * scale)), max(1, round(image.height * scale)))
    return image.resize(size, Image.Resampling.LANCZOS)


def place_on_canvas(image: Image.Image, width: int, height: int) -> Image.Image:
    if width <= 0 or height <= 0:
        raise ValueError("--canvas-width and --canvas-height must both be greater than zero")
    if image.width > width or image.height > height:
        raise ValueError(
            f"Result {image.width}x{image.height} does not fit canvas {width}x{height}"
        )

    canvas = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    left = (width - image.width) // 2
    top = height - image.height
    canvas.alpha_composite(image, (left, top))
    return canvas


def alpha_stats(image: Image.Image) -> dict[str, object]:
    alpha = image.getchannel("A")
    histogram = alpha.histogram()
    transparent = histogram[0]
    opaque = histogram[255]
    partial = image.width * image.height - transparent - opaque
    return {
        "size": [image.width, image.height],
        "mode": image.mode,
        "alpha_extrema": list(alpha.getextrema()),
        "transparent_pixels": transparent,
        "partial_pixels": partial,
        "opaque_pixels": opaque,
        "alpha_bbox": list(alpha.getbbox() or ()),
    }


def main() -> None:
    args = parse_args()
    source = Image.open(args.input)
    result = remove_green(
        source,
        opaque_excess=args.opaque_excess,
        transparent_excess=args.transparent_excess,
        despill=args.despill,
    )

    if args.keep_largest_alpha_component:
        result = keep_largest_alpha_component(result, args.trim_alpha_threshold)

    if args.trim:
        result = trim_transparent(result, args.padding, args.trim_alpha_threshold)

    result = resize_to_fit(result, args.max_width, args.max_height)

    if args.flip_x:
        result = result.transpose(Image.Transpose.FLIP_LEFT_RIGHT)

    if args.canvas_width or args.canvas_height:
        result = place_on_canvas(result, args.canvas_width, args.canvas_height)

    stats = alpha_stats(result)
    total = result.width * result.height
    if stats["transparent_pixels"] < total * 0.05:
        raise ValueError("Extraction produced too little transparency; check the thresholds")
    if stats["opaque_pixels"] < total * 0.01:
        raise ValueError("Extraction produced too little opaque content; check the thresholds")

    args.output.parent.mkdir(parents=True, exist_ok=True)
    if args.output.suffix.lower() == ".webp":
        # Keep RGB values under fully transparent pixels at zero.  Without
        # exact=True, the WebP encoder may replace them with arbitrary colors;
        # those colors can bleed through when a small sprite is filtered.
        result.save(args.output, format="WEBP", lossless=True, method=6, exact=True)
    else:
        result.save(args.output, format="PNG", optimize=True)
    print(json.dumps(stats, ensure_ascii=False))


if __name__ == "__main__":
    main()
