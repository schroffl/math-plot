/**
 * A CSS color string, like
 *
 * - `rgb(0.3 0.3 0.3)`
 * - `#fff`
 * - `hsl(10deg 100% 50%)`
 * - etc.
 *
 * @see {@link CssColorParser}
 */
export type Color = string;

export type Colorscheme = {
    background: Color;
    ticks: Color;
    axes: Color;
    grid: Color;
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

/**
 * Generates a random string of hex-encoded bytes of the given length.
 * Each byte is left-padded with '0' to 2 characters.
 * This is used to generate unique values for {@link MathFunction.id}.
 *
 * @example
 * ```
 * console.log(randomID(8)) // 'f3ab18a0da2023da'
 * ```
 */
export function randomID(length: number = 8): string {
    let out = '';

    for (let i = 0; i < length; i++) {
        const rand = Math.random();
        const byte = Math.floor(rand * 0xff);

        out += byte.toString(16).padStart(2, '0');
    }

    return out;
}

/**
 * A MathFunction wraps a simple function {@link fn} that takes a single number and returns a number. It also
 * contains some configuration options that tell the library how it should be displayed, like its
 * {@link color} or {@link width}.
 */
export type MathFunction = {
    /**
     * The function you want to render.
     *
     * @example (x) => x // Linear
     * @example (x) => Math.sin(x) // Sine
     * @example (x) => Math.cos(x) // Cosine
     * @example (x) => Math.sqrt(x) // Square root
     */
    readonly fn: (x: number) => number;

    /**
     * A CSS color string that controls the rendered color of the line.
     *
     * @see {@link CssColorParser}
     */
    color?: string;

    /**
     * The width of the line in pixels.
     */
    width?: number;

    /**
     * An identifier for this function that is required to be unique. You can use this to modify or
     * remove specific functions later. If you don't specify an ID it gets assigned a random one
     * when it is first rendered.
     *
     * It is also used internally to track state for rendering (see {@link Plot.fn_cache}).
     *
     * @see {@link randomID}
     */
    id?: string;

    /**
     * The amount of samples to collect for this function for rendering, which has a direct impact
     * on performance. Only adjust this if you know what you are doing, because it heavily depends
     * on the characteristics of the function. A linear function like `f(x) = x` is completely fine
     * with only two samples, because it can be accurately rendered from these. However, for
     * functions like a sine wave you need more samples to properly represent it.
     *
     * The performance cost of a large number of samples is only paid when the functions are
     * resampled. For example when the view changes.
     *
     * @see {@link RenderedMathFunction.sample}
     * @see {@link Plot.updateFunctions}
     */
    num_samples?: number;
};
