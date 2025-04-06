export type Color = string;

export type ColorschemeKeys = 'background' | 'axes' | 'grid' | 'ticks';
export type Colorscheme = {
    [key in ColorschemeKeys]: Color;
};

export const DefaultLightColors: Colorscheme = {
    background: '#fff',
    axes: '#000',
    grid: '#eee',
    ticks: '#000',
};

export const DefaultDarkColors: Colorscheme = {
    background: '#111',
    axes: '#eee',
    grid: '#333',
    ticks: '#eee',
};

export type Theme = {
    axis_width: number;
    grid_width: number;
    tick_width: number;
    tick_length: number;
};

export function extendColorscheme(
    colorscheme: Colorscheme,
    replace: Partial<Colorscheme>,
): Colorscheme {
    return Object.assign({}, colorscheme, replace);
}

export function randomID(length: number = 8): string {
    let out = '';

    for (let i = 0; i < length; i++) {
        const rand = Math.random();
        const byte = Math.floor(rand * 0xff);

        out += byte.toString(16).padStart(2, '0');
    }

    return out;
}

export function randomColor(): string {
    let out = '#';

    for (let i = 0; i < 3; i++) {
        const rand = Math.random();
        const byte = Math.floor(rand * 0xff);

        out += byte.toString(16).padStart(2, '0');
    }

    return out;
}

export type MathFunction = {
    readonly fn: (x: number) => number;
    num_samples?: number;
    id?: string;
    color?: string;
    width?: number;
};
