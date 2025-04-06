import { mat4, vec2 } from 'gl-matrix';
import { Buffer, DefaultContext, DrawCommand, Regl } from 'regl';

export type CircleCommandProps = {
    buffer: Buffer;
    size: vec2;
    color: [number, number, number, number];
    projection: mat4;
    view: mat4;
    instances: number;
};

export type CircleCommand = DrawCommand<DefaultContext, CircleCommandProps>;

export function buildCircleCommand(regl: Regl): CircleCommand {
    return regl({
        vert: `
            precision highp float;

            attribute vec2 position;
            attribute vec2 offset;

            uniform vec2 size;
            uniform mat4 view;
            uniform mat4 projection;

            varying vec2 uv;

            // TODO Understand why the hell this is needed. I don't
            //      need it for the lines though... Why?!?!
            const mat4 scale = mat4(
                2.0, 0.0, 0.0, 0.0,
                0.0, 2.0, 0.0, 0.0,
                0.0, 0.0, 2.0, 0.0,
                0.0, 0.0, 0.0, 1.0
            );

            void main() {
                uv = position;

                vec4 point = scale * view * vec4(offset, 0.0, 1.0);

                gl_Position = point + projection * vec4(position * size, 0.0, 1.0);
            }
        `,
        frag: `
            precision highp float;

            uniform vec4 color;

            varying vec2 uv;

            void main() {
                float dist = distance(vec2(0.0), uv);
                float delta = 0.02;
                float alpha = smoothstep(1.0 - delta, 1.0, dist);

                gl_FragColor = mix(color, vec4(color.rgb, 0.0), alpha);
            }
        `,
        attributes: {
            position: regl.buffer([-1, -1, 1, -1, -1, 1, 1, 1]),
            offset: {
                buffer: regl.prop<CircleCommandProps, 'buffer'>('buffer'),
                offset: 0,
                stride: Float32Array.BYTES_PER_ELEMENT * 2,
                divisor: 1,
            },
        },
        uniforms: {
            size: regl.prop<CircleCommandProps, 'size'>('size'),
            color: regl.prop<CircleCommandProps, 'color'>('color'),
            projection: regl.prop<CircleCommandProps, 'projection'>('projection'),
            view: regl.prop<CircleCommandProps, 'view'>('view'),
        },
        instances: regl.prop<CircleCommandProps, 'instances'>('instances'),
        primitive: 'triangle strip',
        count: 4,
        depth: {
            enable: false,
        },
        blend: {
            enable: true,
            func: {
                srcRGB: 'src alpha',
                srcAlpha: 1,
                dstRGB: 'one minus src alpha',
                dstAlpha: 1,
            },
            equation: {
                rgb: 'add',
                alpha: 'add',
            },
            color: [0, 0, 0, 1],
        },
    });
}
