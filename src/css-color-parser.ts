/**
 * I'm not really happy with the fact that color parsing depends on a Browser API. However, I also
 * feel like it would be rather hard to support all different ways of specifying colors in CSS via
 * manual parsing.
 */

export type ParsedColor = [number, number, number, number];

export type ColorCacheEntry = {
    last: string;
    value: ParsedColor;
};

export type ColorCache<
    T extends { [key: string]: string },
    AllDefined = false,
> = AllDefined extends true
    ? {
          [key in keyof T]: ColorCacheEntry;
      }
    : {
          [key in keyof T]?: ColorCacheEntry;
      };

export class CssColorParser {
    public canvas: HTMLCanvasElement;
    public ctx: CanvasRenderingContext2D;

    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d', {
            willReadFrequently: true,
        })!;
    }

    parse(color: string): ParsedColor | undefined {
        this.ctx.clearRect(0, 0, 1, 1);

        this.ctx.fillStyle = '#000';
        this.ctx.fillStyle = color;

        // If the user specified an invalid color the fillStyle is still set to our known value...
        const first = this.ctx.fillStyle;

        this.ctx.fillStyle = '#fff';
        this.ctx.fillStyle = color;

        // We can then specify a different known value that the context reverts to if the user color
        // is not valid.
        const second = this.ctx.fillStyle;

        // And if the second and first sample _don't_ match, we know that the color string is invalid.
        if (second !== first) {
            return undefined;
        }

        this.ctx.fillRect(0, 0, 1, 1);

        const image_data = this.ctx.getImageData(0, 0, 1, 1, { colorSpace: 'srgb' });
        const buffer = image_data.data.slice(0, 4);

        if (buffer.length < 4) {
            throw new Error(
                'Expected getImageData to return a buffer with at least 4 srgb values, but only got ' +
                    buffer.length,
            );
        }

        return [buffer[0] / 255, buffer[1] / 255, buffer[2] / 255, buffer[3] / 255];
    }

    updateCache<T extends { [key: string]: string }>(
        colors: T,
        cache: ColorCache<T>,
        fallback?: ParsedColor,
    ): ColorCache<T, true> {
        for (const key in colors) {
            const raw = colors[key];
            const cached = cache[key];

            if (cached?.last !== raw) {
                const parsed = this.parse(raw);

                if (!parsed && !fallback) {
                    throw new Error(`Failed to parse color '${raw}' and no fallback was provided.`);
                }

                cache[key] = <ColorCacheEntry>{
                    last: raw,
                    value: (parsed ?? fallback)!,
                };
            }
        }

        return cache as ColorCache<T, true>;
    }
}
