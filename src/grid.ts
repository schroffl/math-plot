import { ViewRect } from './view';

export type GridFunction = (view: ViewRect) => Grid;

export type Grid = {
    x: number[];
    y: number[];
};

export function generateGrid(view: ViewRect): Grid {
    return {
        x: generateStops(view.x, view.x + view.w),
        y: generateStops(view.y, view.y + view.h, view.w),
    };
}

export function generateStops(
    from: number,
    to: number,
    range?: number,
    subdivisions: number[] = [1, 2, 5],
): number[] {
    const r = range ?? to - from;
    const magnitude = Math.log10(r);

    const fraction = magnitude - Math.floor(magnitude);
    const subdivision_idx = Math.floor(fraction * subdivisions.length);
    const subdivision = subdivisions[subdivision_idx];

    const inc = Math.pow(10, Math.floor(magnitude) - 1) * subdivision;
    const start = from - (from % inc) - inc;
    const count = Math.ceil((to - start) / inc) + 1;

    // Allocate the required space up front
    const stops = new Array(count);

    for (let i = 0; i < count; i++) {
        stops[i] = start + inc * i;
    }

    return stops;
}
