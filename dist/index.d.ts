import { LRUCache } from 'lru-cache';

interface TerminatorSourceProps {
    tileSize?: number;
    fadeRange?: [number, number];
    is2x?: boolean;
    fetchTileImageBitmap: (key: string) => Promise<ImageBitmap>;
    date?: number;
    stepping?: number;
}
declare class TerminatorSource {
    type: string;
    tileSize: number;
    private tiler;
    private _fadeRange;
    private _date;
    private _stepping;
    tileBitmapCache: LRUCache<string, ImageBitmap>;
    constructor({ tileSize, fadeRange, is2x, fetchTileImageBitmap, date, stepping, }: TerminatorSourceProps);
    clear(): void;
    set fadeRange(value: [number, number]);
    set stepping(value: number);
    set date(value: number);
    loadTile({ x, y, z, }: {
        x: number;
        y: number;
        z: number;
    }): Promise<ImageBitmap>;
}

export { TerminatorSource };
