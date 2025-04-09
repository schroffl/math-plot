---
title: Getting Started
group: Documents
category: Guides
---

To create a new {@link Plot} you need to call the constructor with an HTML
element that will be used as the {@link Plot.host} element.
The second argument to the constructor are the {@link PlotOptions}.
You don't need to pass these as everything can also be added or modified later,
but it's a convenient way to define the initial state of your plot.

```html
<html>
    <head>
        <title>A simple 2D plot</title>

        <!-- TODO Describe how one can include this library. I plan on adding
                  UMD or ESM output so it can easily be included e.g. via unpkg,
                  which I wouldn't recommend for actual use, but might be useful
                  for quickly spinning up a playground / example like this. -->

        <script src="TODO"></script>
        <link rel="stylesheet" href="TODO" />
    </head>
    <body>
        <!-- This element gets "taken over" by the plot -->
        <div id="my_plot"></div>

        <script>
            const host = document.getElementById('my_plot');
            const plot = new Plot(host, {
                view: {
                    x: 0,
                    y: 0,
                    w: Math.PI * 2,
                    h: 2,
                    origin: 'center',
                },
                fns: [
                    { fn: x => Math.sin(x), color: 'rebeccapurple' },
                    { fn: x => Math.cos(x), color: '#FFBC0A' },
                ],
            });
        </script>
    </body>
</html>
```

This is the result of this example.
You can try zooming and dragging the plot to adjust the view.

<div data-plot-example="getting-started"></div>

_I should note that what you see above is not _exactly_ created by the code
snippet above, because I'm using some convience stuff specifically for showing
example plots in the guides and documentation. However, The only thing that's
different is that the colorscheme is controlled by the settings in the
sidebar._
