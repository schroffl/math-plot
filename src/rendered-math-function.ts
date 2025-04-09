import { Buffer, Regl } from 'regl';
import { MathFunction } from './common';
import { ColorCache } from './css-color-parser';

/**
 * A {@link RenderedMathFunction} contains the state needed to render a {@link MathFunction}.
 * You are not supposed to manually create a {@link RenderedMathFunction}. This is done
 * automatically by the {@link Plot}.
 *
 * @see {@link MathFunction}
 * @internal
 */
export class RenderedMathFunction {
    public readonly buffer: Buffer;
    public cpu_buffer: Float32Array;

    /**
     * This cache only contains a single property that is the parsed value of the
     * {@link MathFunction.color | color} property of the {@link func}.
     */
    public color_cache: ColorCache<{ color: string }> = {};

    constructor(
        public readonly func: MathFunction,
        public readonly regl: Regl,
    ) {
        const num_samples = func.num_samples ?? 1000;

        this.cpu_buffer = new Float32Array(num_samples * 2);
        this.buffer = this.regl.buffer({
            data: this.cpu_buffer,
            usage: 'static',
            type: 'float32',
        });
    }

    /**
     * Samples the underlying function {@link func} in the given range and updates the
     * {@link cpu_buffer} with the calculated (x, y) coordinates.
     * The amount of samples is determined by the {@link MathFunction.num_samples | num_samples}
     * property of the {@link func}.
     * This function also ensures that the {@link cpu_buffer} is of correct length.
     * So if {@link MathFunction.num_samples | num_samples} of the {@link func} changes the buffer
     * is resized as required the next time {@link sample} is called.
     *
     * @param from Start sampling at this x value; `from < to`
     * @param to Stop sampling at this x value; `from < to`
     *
     * @see {@link Plot.updateFunctions}
     */
    sample(from: number, to: number): void {
        const num_samples = this.func.num_samples ?? 1000;
        const current_num_samples = this.cpu_buffer.length / 2;

        // The user changed the amount of samples -> allocate space accordingly
        if (num_samples !== current_num_samples) {
            if (num_samples < current_num_samples) {
                this.cpu_buffer = this.cpu_buffer.slice(0, num_samples * 2);
            } else {
                this.cpu_buffer = new Float32Array(num_samples * 2);
            }
        }

        // Now the cpu buffer is guaranteed to be of the correct length and it can be filled.
        for (let i = 0; i < num_samples; i++) {
            const x = (i / (num_samples - 1)) * (to - from) + from;
            const y = this.func.fn(x);

            this.cpu_buffer[i * 2] = x;
            this.cpu_buffer[i * 2 + 1] = y;
        }
    }

    /**
     * Transfers the contents of the {@link cpu_buffer} to GPU memory ({@link buffer}).
     */
    updateGPUBuffer(): void {
        this.buffer(this.cpu_buffer);
    }

    /**
     * Destroy the GPU buffer.
     */
    destroy(): void {
        this.cpu_buffer = this.cpu_buffer.slice(0, 0);
        this.buffer.destroy();
    }
}
