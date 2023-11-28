import { LRUCache } from 'lru-cache';
import TerminatorTiler from './TerminatorTiler.js';

interface TerminatorSourceProps {
  tileSize?: number;
  fadeRange?: [number, number];
  is2x?: boolean;
  fetchTileImageBitmap: (key: string) => Promise<ImageBitmap>;
  date?: number;
  stepping?: number;
}

export default class TerminatorSource {
  type: string;
  tileSize: number;
  private tiler: TerminatorTiler;
  private _fadeRange: [number, number];
  private _date: number;
  private _stepping: number;
  tileBitmapCache: LRUCache<string, ImageBitmap>;

  constructor({
    tileSize = 256,
    fadeRange = [12, -12],
    is2x = window.devicePixelRatio > 1,
    fetchTileImageBitmap,
    date,
    stepping = 0,
  }: TerminatorSourceProps) {
    this.type = 'custom';
    this.tileSize = tileSize;

    const renderSize: number = is2x ? 512 : 256;

    const canvas: HTMLCanvasElement = document.createElement('canvas');
    canvas.width = renderSize;
    canvas.height = renderSize;
    this.tiler = new TerminatorTiler(canvas);
    this._fadeRange = fadeRange;
    this._date = date ?? Date.now();
    this._stepping = stepping;
    this.tileBitmapCache = new LRUCache<string, ImageBitmap>({
      max: 50,
      fetchMethod: fetchTileImageBitmap,
    });
  }

  clear(): void {
    // How is this different from this.update()?
    this.tileBitmapCache.clear();
  }

  set fadeRange(value: [number, number]) {
    this._fadeRange = value;
    this.clear();
  }

  set stepping(value: number) {
    this._stepping = value;
    this.clear();
  }

  set date(value: number) {
    this._date = value;
    this.clear();
  }

  async loadTile({
    x,
    y,
    z,
  }: {
    x: number;
    y: number;
    z: number;
  }): Promise<ImageBitmap> {
    await this.tiler.render({
      x,
      y,
      z,
      date: this._date,
      fadeRange: this._fadeRange,
      stepping: this._stepping,
      texture: await this.tileBitmapCache.fetch(`${z}/${x}/${y}`),
    });
    return this.tiler.getImageBitmap();
  }
}
