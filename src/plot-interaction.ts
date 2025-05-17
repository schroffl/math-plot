import { mat4, vec2 } from 'gl-matrix';
import { scaleView, translateView, View } from './view';

export type Pointer = {
    id: number;
    start: vec2;
    position: vec2;
};

export type ViewInfo = {
    view: View;
    host_element_matrix: mat4;
    inverse_view_matrix: mat4;
    projection_matrix: mat4;
};

export type State =
    | { tag: 'none' }
    | { tag: 'panning'; pointer: Pointer; view_info: ViewInfo }
    | {
          tag: 'pinching';
          first_pointer: Pointer;
          second_pointer: Pointer;
          center: vec2;
          view_info: ViewInfo;
      };

const LINE_HEIGHT = 16;
const PAGE_HEIGHT = 800;

/**
 * TODO: Add the ability to disable certain gestures or interactions (Zooming, panning).
 *       Maybe also restrict the area the user can navigate - in case you want to focus them
 *       on something specific?
 */
export class PlotInteraction {
    public state: State = { tag: 'none' };

    constructor(
        public readonly element: HTMLElement,
        public readonly getViewInfo: () => ViewInfo,
        public readonly updateView: (view: View) => void,
        public readonly viewToMatrix: (view: View) => mat4,
    ) {
        element.addEventListener('pointerdown', (e) => this.onPointerDown(e));
        element.addEventListener('pointermove', (e) => this.onPointerMove(e));
        element.addEventListener('pointerup', (e) => this.onPointerEnd(e));
        element.addEventListener('pointercancel', (e) => this.onPointerEnd(e));
        element.addEventListener('wheel', (e) => this.onWheel(e));
    }

    onPointerDown(event: PointerEvent): void {
        switch (this.state.tag) {
            case 'none': {
                this.state = {
                    tag: 'panning',
                    view_info: this.getViewInfo(),
                    pointer: {
                        id: event.pointerId,
                        start: vec2.fromValues(event.pageX, event.pageY),
                        position: vec2.fromValues(event.pageX, event.pageY),
                    },
                };

                this.element.setPointerCapture(event.pointerId);
                break;
            }

            case 'panning': {
                const view_info = this.getViewInfo();
                const first = this.state.pointer;
                const second = {
                    id: event.pointerId,
                    start: vec2.fromValues(event.pageX, event.pageY),
                    position: vec2.fromValues(event.pageX, event.pageY),
                };

                const first_pos = toWorldPos(first.position, view_info);
                const second_pos = toWorldPos(second.position, view_info);
                const diff = vec2.subtract(vec2.create(), second_pos, first_pos);
                const center = vec2.add(
                    vec2.create(),
                    first_pos,
                    vec2.scale(vec2.create(), diff, 0.5),
                );

                this.state = {
                    tag: 'pinching',
                    first_pointer: {
                        ...first,
                        start: first.position,
                        position: first.position,
                    },
                    second_pointer: second,
                    center: center,
                    view_info: view_info,
                };

                this.element.setPointerCapture(event.pointerId);
                break;
            }
        }
    }

    onPointerEnd(event: PointerEvent): void {
        switch (this.state.tag) {
            case 'panning': {
                if (event.pointerId === this.state.pointer.id) {
                    this.state = { tag: 'none' };
                }

                break;
            }

            case 'pinching': {
                if (event.pointerId === this.state.first_pointer.id) {
                    const second = this.state.second_pointer;
                    this.state = {
                        tag: 'panning',
                        view_info: this.getViewInfo(),
                        pointer: {
                            ...second,
                            start: second.position,
                            position: second.position,
                        },
                    };
                } else if (event.pointerId === this.state.second_pointer.id) {
                    const first = this.state.first_pointer;
                    this.state = {
                        tag: 'panning',
                        view_info: this.getViewInfo(),
                        pointer: {
                            ...first,
                            start: first.position,
                            position: first.position,
                        },
                    };
                }

                break;
            }
        }
    }

    onPointerMove(event: PointerEvent): void {
        switch (this.state.tag) {
            case 'panning': {
                const pointer = this.state.pointer;

                if (event.pointerId === pointer.id) {
                    this.state.pointer.position = vec2.fromValues(event.pageX, event.pageY);

                    const view_info = this.state.view_info;
                    const old_pos = toWorldPos(pointer.start, view_info);
                    const new_pos = toWorldPos(pointer.position, view_info);

                    const diff = vec2.subtract(vec2.create(), old_pos, new_pos);
                    const new_view = translateView(view_info.view, diff[0], diff[1]);

                    this.updateView(new_view);
                }

                break;
            }

            case 'pinching': {
                const first = this.state.first_pointer;
                const second = this.state.second_pointer;

                if (event.pointerId === first.id) {
                    this.state.first_pointer.position = vec2.fromValues(event.pageX, event.pageY);
                } else if (event.pointerId === second.id) {
                    this.state.second_pointer.position = vec2.fromValues(event.pageX, event.pageY);
                }

                const view_info = this.getViewInfo();
                const host_elem = view_info.host_element_matrix;
                const first_start = vec2.transformMat4(vec2.create(), first.start, host_elem);
                const second_start = vec2.transformMat4(vec2.create(), second.start, host_elem);
                const diff_start = vec2.subtract(vec2.create(), first_start, second_start);
                const dist_start = vec2.length(diff_start);

                const first_now = vec2.transformMat4(vec2.create(), first.position, host_elem);
                const second_now = vec2.transformMat4(vec2.create(), second.position, host_elem);
                const diff_now = vec2.subtract(vec2.create(), first_now, second_now);
                const dist_now = vec2.length(diff_now);

                const half_diff_now = vec2.scale(vec2.create(), diff_now, 0.5);
                const center_now = vec2.add(vec2.create(), second_now, half_diff_now);

                const scale = dist_start / dist_now;
                const tmp_view = scaleView(this.state.view_info.view, scale);

                const new_view_matrix = this.viewToMatrix(tmp_view);
                const new_inverse_view_matrix = mat4.invert(mat4.create(), new_view_matrix);

                const new_center = vec2.transformMat4(
                    vec2.create(),
                    center_now,
                    new_inverse_view_matrix,
                );

                const diff = vec2.subtract(vec2.create(), this.state.center, new_center);

                const final_view = translateView(tmp_view, diff[0], diff[1]);
                this.updateView(final_view);

                break;
            }
        }
    }

    onWheel(event: WheelEvent): void {
        event.preventDefault();

        const view_info = this.getViewInfo();

        const pos = toWorldPos(vec2.fromValues(event.pageX, event.pageY), view_info);

        let deltaY = 0;

        switch (event.deltaMode) {
            case WheelEvent.DOM_DELTA_PIXEL:
                deltaY = event.deltaY;
                break;
            case WheelEvent.DOM_DELTA_LINE:
                deltaY = event.deltaY * LINE_HEIGHT;
                break;
            case WheelEvent.DOM_DELTA_PAGE:
                deltaY = event.deltaY * PAGE_HEIGHT;
                break;
            default:
                deltaY = event.deltaY;
        }

        const factor = 0.0008;
        const scale = 1 + factor * deltaY;
        const scaled_view = scaleView(view_info.view, scale);

        const view_matrix = this.viewToMatrix(scaled_view);
        const inverse_view_matrix = mat4.invert(mat4.create(), view_matrix);

        const new_pos = vec2.fromValues(event.pageX, event.pageY);
        vec2.transformMat4(new_pos, new_pos, view_info.host_element_matrix);
        vec2.transformMat4(new_pos, new_pos, inverse_view_matrix);

        const diff = vec2.subtract(vec2.create(), pos, new_pos);
        const final_view = translateView(scaled_view, diff[0], diff[1]);
        this.updateView(final_view);
    }
}

function toWorldPos(position: vec2, view_info: ViewInfo): vec2 {
    let out = vec2.create();
    vec2.transformMat4(out, position, view_info.host_element_matrix);
    vec2.transformMat4(out, out, view_info.inverse_view_matrix);
    return out;
}
