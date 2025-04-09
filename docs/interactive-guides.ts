import { DefaultDarkColors, DefaultLightColors, Plot } from '../src/index';

const Examples = {
    'getting-started': () => import('./getting-started'),
};

const theme_element = document.documentElement;
const listener = window.matchMedia('(prefers-color-scheme: dark)');
const update_colorscheme_of_plots: Plot[]  = [];

const observer = new MutationObserver(mutations => {
    const first = mutations[0]?.target as (HTMLElement | undefined);
    const theme = first?.dataset.theme ?? 'os';
    const colorscheme = {
        light: DefaultLightColors,
        dark: DefaultDarkColors,
        os: listener.matches ? DefaultDarkColors : DefaultLightColors,
    }[theme] ?? DefaultLightColors;

    update_colorscheme_of_plots.forEach(plot => {
        plot.colorscheme = colorscheme;
        plot.render();
    });
});

listener.addEventListener('change', e => {
    const colorscheme = e.matches ? DefaultDarkColors : DefaultLightColors;
    const theme = theme_element.dataset.theme ?? 'os';

    if (theme === 'os') {
        for (const plot of update_colorscheme_of_plots) {
            plot.colorscheme = colorscheme;
            plot.render();
        }
    }
});

observer.observe(theme_element, {
    attributeFilter: ['data-theme'],
});

window.addEventListener('load', async () => {
    const node_list = document.querySelectorAll('[data-plot-example]');
    const list = Array.from(node_list) as HTMLElement[];

    const theme = theme_element.dataset.theme!;
    const initial_colorscheme = {
        light: DefaultLightColors,
        dark: DefaultDarkColors,
        os: listener.matches ? DefaultDarkColors : DefaultLightColors,
    }[theme] ?? DefaultLightColors;

    for (const item of list) {
        const example_name = item.dataset.plotExample ?? 'unknown';
        const load_example = Examples[example_name as keyof typeof Examples];
        const example = await load_example();

        const plot = example.make(item, initial_colorscheme);

        update_colorscheme_of_plots.push(plot);
    }
});
