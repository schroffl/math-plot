export type ViewOriginKeywordX = 'left' | 'center' | 'right';
export type ViewOriginKeywordY = 'top' | 'center' | 'bottom';

export type ViewOrigin =
    | {
          readonly x: number | ViewOriginKeywordX;
          readonly y: number | ViewOriginKeywordY;
      }
    | 'center';

export type ResolvedViewOrigin = {
    readonly x: number;
    readonly y: number;
};

export type FixedView = {
    readonly origin?: ViewOrigin;
    readonly x: number;
    readonly y: number;
    readonly w: number;
    readonly h: number;
};

export type FixedWidthView = {
    readonly origin?: ViewOrigin;
    readonly x: number;
    readonly y: number;
    readonly w: number;
};

export type FixedHeightView = {
    readonly origin?: ViewOrigin;
    readonly x: number;
    readonly y: number;
    readonly h: number;
};

export type View = FixedView | FixedWidthView | FixedHeightView;

/**
 * The origin (x, y) of the ViewRect is always in the bottom left.
 */
export type ViewRect = {
    readonly x: number;
    readonly y: number;
    readonly w: number;
    readonly h: number;
};

export function resolveViewOrigin(origin: ViewOrigin): ResolvedViewOrigin {
    let x = 0;
    let y = 0;

    if (origin === 'center') {
        return { x: 0.5, y: 0.5 };
    }

    if (origin.x === 'left') {
        x = 0;
    } else if (origin.x === 'center') {
        x = 0.5;
    } else if (origin.x === 'right') {
        x = 1;
    } else {
        x = origin.x;
    }

    if (origin.y === 'bottom') {
        y = 0;
    } else if (origin.y === 'center') {
        y = 0.5;
    } else if (origin.y === 'top') {
        y = 1;
    } else {
        y = origin.y;
    }

    return { x, y };
}

export function getViewRect(view: View, width: number, height: number): ViewRect {
    let w = 0;
    let h = 0;

    if ('w' in view && 'h' in view) {
        // Easy, both lengths are given.
        w = view.w;
        h = view.h;
    } else if ('w' in view) {
        // Calculate the height from the width
        h = view.w * (height / width);
        w = view.w;
    } else if ('h' in view) {
        // Calculate the width from the height
        w = view.h * (width / height);
        h = view.h;
    }

    let x = view.x;
    let y = view.y;

    if (view.origin) {
        const resolved_origin = resolveViewOrigin(view.origin);

        x = x - w * resolved_origin.x;
        y = y - h * resolved_origin.y;
    }

    return { x, y, w, h };
}

export function translateView(view: View, x: number, y: number): View {
    return Object.assign({}, view, {
        x: view.x + x,
        y: view.y + y,
    });
}

export function scaleView(view: View, scale: number): View {
    const { x, y } = view;
    const resolved_origin = view.origin ? resolveViewOrigin(view.origin) : { x: 0, y: 0 };

    if ('w' in view && 'h' in view) {
        const new_view = { x, y, w: view.w * scale, h: view.h * scale, origin: view.origin };
        new_view.x -= new_view.w * resolved_origin.x;
        new_view.y -= new_view.w * resolved_origin.y;
        return new_view;
    } else if ('w' in view) {
        const new_view = { x, y, w: view.w * scale, origin: view.origin };
        new_view.x -= view.w * new_view.w * resolved_origin.x;
        return new_view;
    } else if ('h' in view) {
        const new_view = { x, y, h: view.h * scale, origin: view.origin };
        new_view.y -= view.h * new_view.h * resolved_origin.y;
        return new_view;
    } else {
        throw new Error('unreachable');
    }
}

export function viewFromBounds(
    left: number,
    right: number,
    bottom: number,
    top: number,
): FixedView {
    return {
        x: left,
        y: bottom,
        w: right - left,
        h: top - bottom,
        origin: { x: 0, y: 0 },
    };
}

/**
 * A simple default view that focuses on the origin of the coordinate system and shows the x axis in
 * the range [-1, 1]. The height of the view depends on the aspect ratio of the projection.
 */
export const OriginView: View = {
    x: 0,
    y: 0,
    w: 2,
    origin: 'center',
};
