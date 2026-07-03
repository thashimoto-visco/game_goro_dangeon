(function () {
  function createRenderer(options) {
    const ctx = options.ctx;
    const tileSize = options.tileSize;
    const gridToScreenX = options.gridToScreenX;
    const gridToScreenY = options.gridToScreenY;

    function drawRoom(room) {
      const x = gridToScreenX(room.x);
      const y = gridToScreenY(room.y);
      const w = room.w * tileSize;
      const h = room.h * tileSize;

      ctx.save();
      ctx.fillStyle = "rgba(56, 189, 248, 0.08)";
      ctx.strokeStyle = "rgba(56, 189, 248, 0.75)";
      ctx.lineWidth = 2;
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
      ctx.fillStyle = "rgba(224, 242, 254, 0.95)";
      ctx.font = "bold 12px 'Yu Gothic UI', sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(`R${room.id}`, x + 4, y + 4);
      ctx.restore();
    }

    function drawCorridor(corridor) {
      ctx.save();
      ctx.fillStyle = "rgba(20, 184, 166, 0.3)";
      for (const tile of corridor.tiles) {
        ctx.fillRect(gridToScreenX(tile.x) + 9, gridToScreenY(tile.y) + 9, tileSize - 18, tileSize - 18);
      }

      const labelTile = corridor.tiles[Math.floor(corridor.tiles.length / 2)];
      if (labelTile) {
        ctx.fillStyle = "rgba(204, 251, 241, 0.95)";
        ctx.font = "bold 11px 'Yu Gothic UI', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`C${corridor.id}`, gridToScreenX(labelTile.x) + tileSize / 2, gridToScreenY(labelTile.y) + tileSize / 2);
      }
      ctx.restore();
    }

    function drawDoorway(doorway) {
      ctx.save();
      ctx.strokeStyle = "rgba(250, 204, 21, 0.95)";
      ctx.lineWidth = 3;
      ctx.strokeRect(gridToScreenX(doorway.x) + 4, gridToScreenY(doorway.y) + 4, tileSize - 8, tileSize - 8);
      ctx.fillStyle = "rgba(250, 204, 21, 0.3)";
      ctx.fillRect(gridToScreenX(doorway.outsideX) + 10, gridToScreenY(doorway.outsideY) + 10, tileSize - 20, tileSize - 20);
      ctx.restore();
    }

    function drawVisibleTiles(visibleTiles) {
      ctx.save();
      ctx.strokeStyle = "rgba(134, 239, 172, 0.28)";
      ctx.lineWidth = 1;
      for (const key of visibleTiles) {
        const [x, y] = key.split(",").map(Number);
        ctx.strokeRect(gridToScreenX(x) + 1.5, gridToScreenY(y) + 1.5, tileSize - 3, tileSize - 3);
      }
      ctx.restore();
    }

    function draw(layout, visibleTiles) {
      ctx.save();
      for (const room of layout.rooms) drawRoom(room);
      for (const corridor of layout.corridors) drawCorridor(corridor);
      for (const doorway of layout.doorways) drawDoorway(doorway);
      drawVisibleTiles(visibleTiles);
      ctx.restore();
    }

    return { draw };
  }

  window.GORO_DUNGEON_DEBUG_OVERLAY = {
    createRenderer,
  };
})();
