import { mat4 } from 'gl-matrix';
import { Buffer, DefaultContext, DrawCommand, Regl } from 'regl';

export type InstancedRectangleCommandProps = {
    buffer: Buffer | Float32Array;
    width: number;
    color: [number, number, number, number];
    projection: mat4;
    view: mat4;
    instances: number;
};

export type InstancedRectangleCommand = DrawCommand<DefaultContext, InstancedRectangleCommandProps>;

export function buildInstancedRectangleCommand(
    regl: Regl,
    stride: number,
): InstancedRectangleCommand {
    return regl({
        // TODO Maybe add an optional check that somehow prevents a line from rendering if it's too
        // steep. This would be very useful for functions with discontinuities. Just setting the
        // color to be transparent would be sufficient I suppose.
        // NOTE: Account for angle *and* distance and make the thresholds configurable. Maybe on a
        // per-function basis?
        vert: `
            precision highp float;

            attribute vec2 position;
            attribute vec2 start;
            attribute vec2 end;

            uniform mat4 view;
            uniform mat4 projection;
            uniform float width;

            void main() {
                vec4 start2 = view * vec4(start, 0.0, 1.0);
                vec4 end2 = view * vec4(end, 0.0, 1.0);

                vec2 xBasis = end2.xy - start2.xy;
                vec2 yBasis = normalize(vec2(-xBasis.y, xBasis.x));

                vec2 point = start2.xy + xBasis * position.x + (projection * vec4(yBasis * width * position.y, 0.0, 1.0)).xy;

                gl_Position = vec4(point, 0.0, 1.0);
            }
        `,
        frag: `
            precision highp float;

            uniform vec4 color;

            void main() {
                gl_FragColor = color;
            }
        `,
        attributes: {
            position: regl.buffer([0, -0.5, 1, -0.5, 0, 0.5, 1, 0.5]),
            start: {
                buffer: regl.prop<InstancedRectangleCommandProps, 'buffer'>('buffer'),
                offset: 0,
                stride: Float32Array.BYTES_PER_ELEMENT * stride,
                divisor: 1,
            },
            end: {
                buffer: regl.prop<InstancedRectangleCommandProps, 'buffer'>('buffer'),
                offset: Float32Array.BYTES_PER_ELEMENT * 2,
                stride: Float32Array.BYTES_PER_ELEMENT * stride,
                divisor: 1,
            },
        },
        uniforms: {
            width: regl.prop<InstancedRectangleCommandProps, 'width'>('width'),
            color: regl.prop<InstancedRectangleCommandProps, 'color'>('color'),
            projection: regl.prop<InstancedRectangleCommandProps, 'projection'>('projection'),
            view: regl.prop<InstancedRectangleCommandProps, 'view'>('view'),
        },
        instances: regl.prop<InstancedRectangleCommandProps, 'instances'>('instances'),
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
