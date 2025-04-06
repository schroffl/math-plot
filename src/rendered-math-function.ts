import { Buffer, Regl } from 'regl';
import { MathFunction } from './common';
import { ColorCache } from './css-color-parser';

export class RenderedMathFunction {
    public readonly buffer: Buffer;
    public cpu_buffer: Float32Array;
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

    updateGPUBuffer(): void {
        this.buffer(this.cpu_buffer);
    }

    destroy(): void {
        this.cpu_buffer = this.cpu_buffer.slice(0, 0);
        this.buffer.destroy();
    }
}
