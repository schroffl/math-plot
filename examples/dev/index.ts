import { DefaultDarkColors, Plot } from '../../src';

const host = document.getElementById('host')!;

const plot = new Plot(host, {
    colorscheme: Object.assign({}, DefaultDarkColors, {
        background: 'transparent',
        ticks: '#fff',
        axes: '#fff',
        grid: '#555',
    }),
    theme: {
        axis_width: 2,
        grid_width: 1,
        tick_length: 2,
        tick_width: 10,
    },
    view: { x: 0, y: -1, h: 2 },
    fns: [
        {
            fn: (x) => Math.sin(x * Math.PI * 2),
            color: 'rebeccapurple',
            num_samples: 10000,
        },
        {
            fn: (x) => Math.cos(x * Math.PI * 2),
            color: 'cornflowerblue',
            num_samples: 10000,
        },
    ],
    css_transform_parent_limit: document.documentElement,
});

(window as any).plot = plot;
