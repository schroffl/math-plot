/**
 * I'm not set on using JSX and maquette for the UI - just giving it a shot.
 * If the UI stays simple I'm just gonna reimplement this in plain JS and
 * eliminate the dependency.
 */

import { createProjector, Projector } from 'maquette';
import { jsxCreateElement } from './common';
import { Plot } from '../plot';

const UI = (state: UIState) => {
    const theme = state.plot.theme;
    const labels = state.labels.map((info, index) => {
        let { x, y } = info;

        if (info.axis === 'x') {
            y += theme.tick_length / 2;
        } else if (info.axis === 'y') {
            x -= theme.tick_length / 2;
        }

        const styles = {
            left: `${x}px`,
            top: `${y}px`,
        };

        return (
            <span key={index} class={'label label-' + info.axis} styles={styles}>
                {info.text}
            </span>
        );
    });

    const colors = state.plot.color_parser.updateCache(
        state.plot.colorscheme,
        state.plot.color_cache,
    );
    const style = `--text-background: ${colors.background.last}; --text-color: ${colors.axes.last};`;

    return (
        <div style={style}>
            <div class="tick-labels" key="tick-labels">
                {...labels}
            </div>
            <MousePosition mouse={state.mouse}></MousePosition>
        </div>
    );
};

const MousePosition = (props: { mouse: UIState['mouse'] }) => {
    let x_str = props.mouse.x.toFixed(30);
    let y_str = props.mouse.y.toFixed(30);

    const dot_diff = x_str.indexOf('.') - y_str.indexOf('.');

    if (dot_diff > 0) {
        y_str = ' '.repeat(dot_diff) + y_str;
    } else if (dot_diff < 0) {
        x_str = ' '.repeat(-dot_diff) + x_str;
    }

    const str = `${x_str}\n${y_str}`;

    return <div class="mouse-position bottom-left">{str}</div>;
};

export type LabelInfo = {
    x: number;
    y: number;
    axis: string;
    text: string;
};

export type UIState = {
    plot: Plot;
    mouse: { x: number; y: number };
    labels: LabelInfo[];
};

export class UIRenderer {
    private readonly projector: Projector;
    public state?: UIState;

    constructor(
        public readonly plot: Plot,
        public readonly host: HTMLElement,
    ) {
        this.projector = createProjector();
        this.projector.merge(this.host, this.internalRender.bind(this));
    }

    internalRender(): JSX.Element {
        if (this.state) {
            return UI(this.state);
        } else {
            return (
                <div>
                    <span>Missing UI State</span>
                </div>
            );
        }
    }

    update(state: UIState): void {
        this.state = state;
    }

    render(): void {
        this.projector.renderNow();
    }
}
