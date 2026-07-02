(function () {
  function createRenderer(options) {
    const ctx = options.ctx;
    const tileSize = options.tileSize;
    const sprites = options.sprites;
    const drawSprite = options.drawSprite;
    const tileKindAt = options.tileKindAt;
    const isWalkable = options.isWalkable;
    const gridToScreenX = options.gridToScreenX;
    const gridToScreenY = options.gridToScreenY;
    const getFloor = options.getFloor;

    function tileVariant(x, y, count) {
      return Math.abs((x * 31 + y * 17 + getFloor() * 13) % count);
    }

    function drawRoundRectPath(x, y, w, h, r) {
      const radius = Math.min(r, w / 2, h / 2);
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + w - radius, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
      ctx.lineTo(x + w, y + h - radius);
      ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
      ctx.lineTo(x + radius, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
    }

    function drawFallbackTile(tile, sx, sy) {
      ctx.fillStyle = tile === "#" ? "#111827" : "#202b44";
      ctx.fillRect(sx, sy, tileSize - 1, tileSize - 1);
    }

    function drawRoomFloorDetail(sx, sy, x, y) {
      ctx.save();
      ctx.fillStyle = "rgba(216, 180, 104, 0.055)";
      ctx.fillRect(sx + 2, sy + 2, tileSize - 4, tileSize - 4);

      ctx.strokeStyle = "rgba(148, 163, 184, 0.12)";
      ctx.lineWidth = 1;
      if (tileVariant(x, y, 4) === 0) {
        ctx.beginPath();
        ctx.moveTo(sx + 7, sy + 18);
        ctx.lineTo(sx + 22, sy + 18);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawCorridorFloorDetail(sx, sy, x, y) {
      const hasHorizontal = isWalkable(x - 1, y) || isWalkable(x + 1, y);
      const hasVertical = isWalkable(x, y - 1) || isWalkable(x, y + 1);

      ctx.save();
      ctx.fillStyle = "rgba(2, 6, 23, 0.24)";
      ctx.fillRect(sx + 1, sy + 1, tileSize - 2, tileSize - 2);

      ctx.fillStyle = "rgba(20, 184, 166, 0.08)";
      if (hasHorizontal && !hasVertical) {
        ctx.fillRect(sx + 3, sy + 13, tileSize - 6, 6);
      } else if (hasVertical && !hasHorizontal) {
        ctx.fillRect(sx + 13, sy + 3, 6, tileSize - 6);
      } else {
        ctx.fillRect(sx + 12, sy + 12, 8, 8);
        if (hasHorizontal) ctx.fillRect(sx + 3, sy + 14, tileSize - 6, 4);
        if (hasVertical) ctx.fillRect(sx + 14, sy + 3, 4, tileSize - 6);
      }

      ctx.strokeStyle = "rgba(3, 7, 18, 0.45)";
      ctx.strokeRect(sx + 2.5, sy + 2.5, tileSize - 5, tileSize - 5);
      ctx.restore();
    }

    function drawDoorwayDetail(sx, sy, x, y) {
      const hasHorizontalCorridor = tileKindAt(x - 1, y) === "corridor" || tileKindAt(x + 1, y) === "corridor";

      ctx.save();
      ctx.fillStyle = "rgba(214, 177, 95, 0.16)";
      ctx.fillRect(sx + 3, sy + 3, tileSize - 6, tileSize - 6);
      ctx.strokeStyle = "rgba(250, 204, 21, 0.36)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (hasHorizontalCorridor) {
        ctx.moveTo(sx + tileSize / 2, sy + 5);
        ctx.lineTo(sx + tileSize / 2, sy + tileSize - 5);
      } else {
        ctx.moveTo(sx + 5, sy + tileSize / 2);
        ctx.lineTo(sx + tileSize - 5, sy + tileSize / 2);
      }
      ctx.stroke();
      ctx.restore();
    }

    function drawWallEdgeDetail(sx, sy, x, y) {
      const touchesFloor = isWalkable(x + 1, y) || isWalkable(x - 1, y) || isWalkable(x, y + 1) || isWalkable(x, y - 1);
      if (!touchesFloor) return;

      ctx.save();
      ctx.fillStyle = "rgba(3, 7, 18, 0.34)";
      if (isWalkable(x, y + 1)) ctx.fillRect(sx, sy + tileSize - 5, tileSize, 5);
      if (isWalkable(x, y - 1)) ctx.fillRect(sx, sy, tileSize, 4);
      if (isWalkable(x + 1, y)) ctx.fillRect(sx + tileSize - 4, sy, 4, tileSize);
      if (isWalkable(x - 1, y)) ctx.fillRect(sx, sy, 4, tileSize);

      ctx.strokeStyle = "rgba(214, 177, 95, 0.14)";
      ctx.lineWidth = 1;
      if (isWalkable(x, y + 1)) {
        ctx.beginPath();
        ctx.moveTo(sx + 2, sy + tileSize - 6);
        ctx.lineTo(sx + tileSize - 2, sy + tileSize - 6);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawTileStructureDetail(tile, x, y, sx, sy) {
      if (tile === "#") {
        drawWallEdgeDetail(sx, sy, x, y);
        return;
      }

      const kind = tileKindAt(x, y);
      if (kind === "room") {
        drawRoomFloorDetail(sx, sy, x, y);
      } else if (kind === "corridor") {
        drawCorridorFloorDetail(sx, sy, x, y);
      } else if (kind === "doorway") {
        drawDoorwayDetail(sx, sy, x, y);
      }
    }

    function drawTile(tile, x, y) {
      const group = tile === "#" ? sprites.wall : sprites.floor;
      const sprite = group[tileVariant(x, y, group.length)];
      const sx = gridToScreenX(x);
      const sy = gridToScreenY(y);
      const didDraw = drawSprite(sprite, sx, sy, tileSize, tileSize);
      if (!didDraw) {
        drawFallbackTile(tile, sx, sy);
      }
      drawTileStructureDetail(tile, x, y, sx, sy);
    }

    return { drawTile };
  }

  window.GORO_DUNGEON_TILE_RENDERER = {
    createRenderer,
  };
})();
