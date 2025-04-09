import { Colorscheme, Plot } from '../src/index';

export function make(host: HTMLElement, colorscheme: Colorscheme) {
    const plot = new Plot(host, {
        colorscheme: colorscheme,
        view: {
            x: 0,
            y: 0,
            w: Math.PI * 2,
            h: 2,
            origin: 'center',
        },
        fns: [
            {
                fn: x => Math.sin(x),
                color: 'rebeccapurple',
            },
            {
                fn: x => Math.cos(x),
                color: '#FFBC0A',
            },
        ],
    });

    return plot;
}
