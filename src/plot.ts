import createREGL, { Buffer, Regl } from 'regl';
import { Colorscheme, DefaultLightColors, MathFunction, randomID, Theme } from './common';
import { generateGrid, GridFunction } from './grid';
import { getViewRect, OriginView, scaleView, translateView, View, ViewRect } from './view';
import { buildCircleCommand, CircleCommand } from './commands/circle';
import { mat4, vec2 } from 'gl-matrix';
import {
    buildInstancedRectangleCommand,
    InstancedRectangleCommand,
} from './commands/instanced-rectangle';
import { UIRenderer } from './ui/ui';
import { RenderedMathFunction } from './rendered-math-function';
import { ColorCache, CssColorParser, ParsedColor } from './css-color-parser';

/**
 * @privateRemarks TODO: Make UI configurable
 */
export interface PlotOptions {
    /**
     * The initial view of the plot.
     *
     * @defaultValue {@link OriginView}
     * @see {@link Plot.view}
     * @see {@link Plot.setView}
     */
    view?: View;

    /**
     * The initial colorscheme of the plot.
     *
     * @defaultValue {@link DefaultLightColors}
     * @see {@link Plot.colorscheme}
     */
    colorscheme?: Colorscheme;

    theme?: Theme;

    /**
     * A list of functions that are initially rendered. Defaults to an empty list.
     *
     * @defaultValue []
     * @see {@link Plot.fns}
     */
    fns?: MathFunction[];

    /**
     * A function that generates the grid lines to be rendered.
     *
     * @defaultValue {@link generateGrid}
     * @see {@link GridFunction}
     * @see {@link Plot.grid}
     */
    grid?: GridFunction;

    /**
     * When updating the element matrix in {@link Plot.updateElementMatrix} take into consideration
     * the [CSS `transform` property](https://developer.mozilla.org/en-US/docs/Web/CSS/transform) up
     * until and including this element.
     *
     * @defaultValue {@link Plot.host}
     * @see {@link Plot.updateElementMatrix}
     * @see {@link Plot.css_transform_parent_limit}
     * @see [The CSS `transform` property](https://developer.mozilla.org/en-US/docs/Web/CSS/transform)
     */
    css_transform_parent_limit?: HTMLElement;
}

export type DragInfo = {
    /**
     * The [pointerId](https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/pointerId) of
     * the pointer that started dragging.
     */
    pointerId: number;
    position: vec2;
    view: View;
    matrix: mat4;
};

export class Plot {
    public readonly canvas: HTMLCanvasElement;
    public readonly ui_layers: HTMLDivElement;
    public readonly ui: UIRenderer;
    public readonly color_parser: CssColorParser = new CssColorParser();

    public readonly regl: Regl;
    public readonly circle: CircleCommand;
    public readonly rectangleStrip: InstancedRectangleCommand;
    public readonly rectangles: InstancedRectangleCommand;

    public view!: View;
    public projection_matrix: mat4 = mat4.create();
    public view_matrix: mat4 = mat4.create();
    public inverse_view_matrix: mat4 = mat4.create();

    public grid: GridFunction;

    public colorscheme: Colorscheme;
    public theme: Theme;

    public color_cache: ColorCache<Colorscheme> = {};

    public drag_info?: DragInfo;

    private view_rect!: ViewRect;

    private cursor_position: vec2 = vec2.fromValues(0, 0);

    public host_element_matrix: mat4 = mat4.create();
    public canvas_element_matrix: mat4 = mat4.create();
    public inverse_host_element_matrix: mat4 = mat4.create();
    public inverse_canvas_element_matrix: mat4 = mat4.create();

    public fns: MathFunction[] = [];

    private readonly cursor_buffer: Buffer;

    /** @internal */
    public readonly fn_cache: { [key: string]: RenderedMathFunction } = {};

    private readonly axes_buffer: Buffer;
    private readonly grid_buffer: Buffer;
    private readonly tick_buffer: Buffer;
    private grid_line_count: number = 0;

    public animation_frame_request?: number;
    public is_dirty: boolean = false;

    public css_transform_parent_limit: HTMLElement;

    constructor(
        public readonly host: HTMLElement,
        options?: PlotOptions,
    ) {
        this.grid = options?.grid ?? generateGrid;
        this.css_transform_parent_limit = options?.css_transform_parent_limit ?? this.host;
        this.colorscheme = options?.colorscheme ?? DefaultLightColors;
        this.theme = options?.theme ?? {
            axis_width: 2,
            grid_width: 1,
            tick_width: 2,
            tick_length: 10,
        };

        this.canvas = document.createElement('canvas');
        this.ui_layers = document.createElement('div');

        this.ui_layers.classList.add('ui-layers');

        this.host.classList.add('math-plot-host');
        this.host.appendChild(this.canvas);
        this.host.appendChild(this.ui_layers);

        this.ui = new UIRenderer(this, this.ui_layers);

        this.regl = createREGL({
            canvas: this.canvas,
            extensions: ['angle_instanced_arrays'],
            attributes: {
                alpha: true,
                premultipliedAlpha: true,
            },
        });

        this.fns = options?.fns ?? [];

        this.circle = buildCircleCommand(this.regl);
        this.rectangleStrip = buildInstancedRectangleCommand(this.regl, 2);
        this.rectangles = buildInstancedRectangleCommand(this.regl, 4);

        this.cursor_buffer = this.regl.buffer({
            usage: 'static',
            type: 'float32',
        });

        this.axes_buffer = this.regl.buffer({
            usage: 'static',
            type: 'float32',
        });

        this.grid_buffer = this.regl.buffer({
            usage: 'static',
            type: 'float32',
        });

        this.tick_buffer = this.regl.buffer({
            usage: 'static',
            type: 'float32',
        });

        this.setView(options?.view ?? OriginView);

        const gl = this.regl._gl;
        const canvas = gl.canvas;

        if (canvas instanceof HTMLCanvasElement) {
            const obs = new ResizeObserver(() => {
                this.updateCanvasSize();
            });

            obs.observe(canvas);
        }

        this.setupEventListeners(this.host);
        this.markDirty();
    }

    setupEventListeners(target: HTMLElement) {
        target.addEventListener('pointermove', (e) => {
            const pos = vec2.fromValues(e.pageX, e.pageY);

            vec2.transformMat4(this.cursor_position, pos, this.host_element_matrix);
            vec2.transformMat4(
                this.cursor_position,
                this.cursor_position,
                this.inverse_view_matrix,
            );

            this.updateUIState();
        });

        target.addEventListener('pointerdown', (e) => {
            if (this.drag_info) {
                return;
            }

            const pos = vec2.fromValues(e.pageX, e.pageY);
            vec2.transformMat4(pos, pos, this.host_element_matrix);
            vec2.transformMat4(pos, pos, this.inverse_view_matrix);

            target.setPointerCapture(e.pointerId);

            this.drag_info = {
                pointerId: e.pointerId,
                position: pos,
                view: Object.assign({}, this.view),
                matrix: mat4.copy(mat4.create(), this.inverse_view_matrix),
            };
        });

        target.addEventListener('pointermove', (e) => {
            if (e.pointerId != this.drag_info?.pointerId) {
                return;
            }

            const old_pos = this.drag_info.position;
            const pos = vec2.fromValues(e.pageX, e.pageY);

            vec2.transformMat4(pos, pos, this.host_element_matrix);
            vec2.transformMat4(pos, pos, this.drag_info.matrix);

            const diff = vec2.subtract(vec2.create(), old_pos, pos);
            const new_view = translateView(this.drag_info.view, diff[0], diff[1]);

            this.setView(new_view);
        });

        target.addEventListener('pointerup', (e) => {
            if (e.pointerId === this.drag_info?.pointerId) {
                this.drag_info = undefined;
            }
        });

        // FIXME Currently this code relies on call setView 2 times, but that does a lot of
        //       unnecessary work like calculating the function values.
        target.addEventListener('wheel', (e) => {
            e.preventDefault();

            const pos = vec2.fromValues(e.pageX, e.pageY);
            vec2.transformMat4(pos, pos, this.host_element_matrix);
            vec2.transformMat4(pos, pos, this.inverse_view_matrix);

            // TODO Find out if this works from a UX perspective on different machines. Scrolling
            //      mechanics are a little finicky.
            const scale = 1 + 0.1 * Math.sign(e.deltaY);
            const scaled_view = scaleView(this.view, scale);

            this.setView(scaled_view);

            const new_pos = vec2.fromValues(e.pageX, e.pageY);
            vec2.transformMat4(new_pos, new_pos, this.host_element_matrix);
            vec2.transformMat4(new_pos, new_pos, this.inverse_view_matrix);

            const diff = vec2.subtract(vec2.create(), pos, new_pos);

            const final_view = translateView(this.view, diff[0], diff[1]);

            this.setView(final_view);

            // TODO Make zooming while dragging work.
            if (this.drag_info) {
                target.releasePointerCapture(this.drag_info.pointerId);
                this.drag_info = undefined;
            }
        });
    }

    updateCanvasSize() {
        const cv = this.canvas;
        const dpr = window.devicePixelRatio ?? 1;

        cv.width = cv.offsetWidth * dpr;
        cv.height = cv.offsetHeight * dpr;

        this.updateElementMatrix();
        this.setView(this.view);
    }

    /**
     * @see {@link Plot.css_transform_parent_limit}
     */
    updateElementMatrix() {
        const host = this.host;
        const canvas = this.canvas;

        const stop = this.css_transform_parent_limit;
        let elem: HTMLElement | null = host;

        const transform_matrix = mat4.create();

        while (elem) {
            const style = window.getComputedStyle(elem);
            const transform = new DOMMatrixReadOnly(style.transform);

            // TODO Account for the transform origin
            // const transform_origin = style.transformOrigin;
            // const parts = transform_origin.split(' ');
            // const origin = vec2.fromValues(parseFloat(parts[0]), parseFloat(parts[1]));

            mat4.multiply(transform_matrix, transform.toFloat32Array(), transform_matrix);

            if (elem === stop) {
                break;
            }

            elem = elem.parentElement;
        }

        mat4.invert(transform_matrix, transform_matrix);

        const x = host.offsetLeft;
        const y = host.offsetTop;
        const w = host.offsetWidth;
        const h = host.offsetHeight;

        mat4.ortho(this.host_element_matrix, x, x + w, y + h, y, 0, 1);
        mat4.multiply(this.host_element_matrix, this.host_element_matrix, transform_matrix);
        mat4.invert(this.inverse_host_element_matrix, this.host_element_matrix);

        const cx = canvas.offsetLeft;
        const cy = canvas.offsetTop;
        const cw = canvas.offsetWidth;
        const ch = canvas.offsetHeight;
        mat4.ortho(this.canvas_element_matrix, cx, cx + cw, cy + ch, cy, 0, 1);
        mat4.invert(this.inverse_canvas_element_matrix, this.canvas_element_matrix);
    }

    setView(view: View) {
        const gl = this.regl._gl;
        const rect = getViewRect(view, gl.drawingBufferWidth, gl.drawingBufferHeight);

        this.view = view;
        this.view_rect = rect;

        this.updateRenderMatrices(rect);
        this.updateGrid(rect);
        this.updateFunctions(rect);
        this.updateUIState();
        this.markDirty();
    }

    updateRenderMatrices(view: ViewRect): void {
        const cv = this.canvas;
        const w = cv.offsetWidth;
        const h = cv.offsetHeight;

        mat4.ortho(this.projection_matrix, -w / 2, w / 2, -h / 2, h / 2, 0, 1);

        mat4.ortho(this.view_matrix, view.x, view.x + view.w, view.y, view.y + view.h, -1, 1);

        mat4.invert(this.inverse_view_matrix, this.view_matrix);
    }

    /**
     * @see {@link RenderedMathFunction.sample}
     * @see {@link MathFunction.num_samples}
     */
    updateFunctions(view: ViewRect): void {
        const from = view.x;
        const to = view.x + view.w;

        const visited = new Array(this.fns.length);

        for (const fn of this.fns) {
            if (!fn.id) {
                fn.id = randomID();
            }

            const rfn = this.getRenderedFunction(fn.id, fn);

            rfn.sample(from, to);
            rfn.updateGPUBuffer();

            visited.push(fn.id);
        }

        for (const id in this.fn_cache) {
            const was_visited = visited.includes(id);

            if (!was_visited) {
                this.fn_cache[id].destroy();
                delete this.fn_cache[id];
            }
        }
    }

    getRenderedFunction(id: string, fn: MathFunction): RenderedMathFunction {
        if (!(id in this.fn_cache)) {
            this.fn_cache[id] = new RenderedMathFunction(fn, this.regl);
        }

        return this.fn_cache[id];
    }

    updateGrid(view: ViewRect) {
        const grid = this.grid(view);
        const count = grid.x.length + grid.y.length;
        const grid_buffer = new Float32Array(count * 4);
        const tick_buffer = new Float32Array(count * 4);

        const tick_length = vec2.fromValues(
            this.theme.tick_length * 0.5,
            this.theme.tick_length * 0.5,
        );

        vec2.transformMat4(tick_length, tick_length, this.projection_matrix);

        for (let i = 0; i < grid.x.length; i++) {
            const x = grid.x[i];
            const y0 = view.y;
            const y1 = view.y + view.h;

            grid_buffer.set([x, y0, x, y1], i * 4);

            const tick_pos = vec2.fromValues(x, 0);
            vec2.transformMat4(tick_pos, tick_pos, this.view_matrix);

            const tick_y0 = tick_pos[1] - tick_length[1];
            const tick_y1 = tick_pos[1] + tick_length[1];

            tick_buffer.set([tick_pos[0], tick_y0, tick_pos[0], tick_y1], i * 4);
        }

        for (let i = 0; i < grid.y.length; i++) {
            const y = grid.y[i];
            const x0 = view.x;
            const x1 = view.x + view.w;

            grid_buffer.set([x0, y, x1, y], grid.x.length * 4 + i * 4);

            const tick_pos = vec2.fromValues(0, y);
            vec2.transformMat4(tick_pos, tick_pos, this.view_matrix);

            const tick_x0 = tick_pos[0] - tick_length[0];
            const tick_x1 = tick_pos[0] + tick_length[0];

            tick_buffer.set(
                [tick_x0, tick_pos[1], tick_x1, tick_pos[1]],
                grid.x.length * 4 + i * 4,
            );
        }

        this.grid_line_count = count;
        this.grid_buffer(grid_buffer);
        this.tick_buffer(tick_buffer);
    }

    updateUIState() {
        const grid = this.grid(this.view_rect);
        const mapPoint = (x: number, y: number) => {
            const pos = vec2.fromValues(x, y);
            vec2.transformMat4(pos, pos, this.view_matrix);
            vec2.transformMat4(pos, pos, this.inverse_canvas_element_matrix);
            return pos;
        };

        this.ui.update({
            plot: this,
            mouse: {
                x: this.cursor_position[0],
                y: this.cursor_position[1],
            },
            labels: [
                ...grid.x
                    .filter((x) => x !== 0)
                    .map((x) => {
                        const p = mapPoint(x, 0);
                        return { x: p[0], y: p[1], text: x.toFixed(1), axis: 'x' };
                    }),
                ...grid.y
                    .filter((y) => y !== 0)
                    .map((y) => {
                        const p = mapPoint(0, y);
                        return { x: p[0], y: p[1], text: y.toFixed(1), axis: 'y' };
                    }),
            ],
        });

        this.markDirty();
    }

    markDirty() {
        this.is_dirty = true;

        if (typeof this.animation_frame_request !== 'number') {
            this.animation_frame_request = requestAnimationFrame(() => {
                this.animation_frame_request = undefined;

                this.regl.poll();
                this.render();
            });
        }
    }

    line(buffer: Buffer, width: number, count: number, color: ParsedColor): void {
        // Round joins
        this.circle({
            buffer: buffer,
            color: color,
            view: this.view_matrix,
            projection: this.projection_matrix,
            size: vec2.fromValues(width, width),
            instances: count,
        });

        this.rectangleStrip({
            buffer: buffer,
            width: width,
            projection: this.projection_matrix,
            view: this.view_matrix,
            color: color,
            instances: count - 1,
        });
    }

    render(): void {
        const view_rect = this.view_rect;
        const colorscheme = this.color_parser.updateCache(this.colorscheme, this.color_cache);
        const axis_thickness = this.theme.axis_width;
        const grid_thickness = this.theme.grid_width;

        this.is_dirty = false;
        this.ui.render();

        this.regl.clear({
            color: colorscheme.background.value,
            depth: 1,
        });

        // Render the grid
        this.rectangles({
            buffer: this.grid_buffer,
            width: grid_thickness,
            projection: this.projection_matrix,
            view: this.view_matrix,
            color: colorscheme.grid.value,
            instances: this.grid_line_count,
        });

        this.rectangles({
            buffer: this.tick_buffer,
            width: this.theme.tick_width,
            color: colorscheme.ticks.value,
            projection: this.projection_matrix,
            view: mat4.create(),
            instances: this.grid_line_count,
        });

        this.axes_buffer([
            view_rect.x,
            0,
            view_rect.x + view_rect.w,
            0,
            0,
            view_rect.y,
            0,
            view_rect.y + view_rect.h,
        ]);

        // Render the axes
        this.rectangles({
            buffer: this.axes_buffer,
            width: axis_thickness,
            projection: this.projection_matrix,
            view: this.view_matrix,
            color: colorscheme.axes.value,
            instances: 2,
        });

        // Render all functions
        for (const key in this.fn_cache) {
            const fn = this.fn_cache[key];
            const config = fn.func;
            const size = config.width ?? 5;
            const samples = fn.cpu_buffer.length / 2;
            const color = config.color ?? 'blue';

            const parsed = this.color_parser.updateCache({ color }, fn.color_cache);

            this.line(fn.buffer, size, samples, parsed.color.value);
        }

        this.cursor_buffer(this.cursor_position);

        // Render the 'crosshair' where the user is pointing at
        this.circle({
            buffer: this.cursor_buffer,
            size: vec2.fromValues(15, 15),
            projection: this.projection_matrix,
            view: this.view_matrix,
            color: [1, 0, 0, 1],
            instances: 1,
        });
    }
}
