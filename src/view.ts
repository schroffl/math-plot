/**
 * This file contains everything related to the plot view, which is the area of the coordinate
 * system that is rendered to the screen.
 *
 * @module
 */

/**
 * The ViewOrigin determines where in the view the specified x and y coordinate should be placed. A
 * value of 0.5 for x and y will put the "focus" point at the center of the view. Whereas setting
 * both to 0 puts the point in the bottom left corner and a value of 1 puts it in the top right
 * corner.
 *
 * You may also use {@link ViewOriginKeywordX} and {@link ViewOriginKeywordY} respectively.
 *
 * You may also specify the string `'center'` which horizontally and vertically centers the
 * point in the view.
 *
 * @see {@link FixedView.origin}
 * @see {@link FixedWidthView.origin}
 * @see {@link FixedHeightView.origin}
 */
export type ViewOrigin =
    | {
          readonly x: number | ViewOriginKeywordX;
          readonly y: number | ViewOriginKeywordY;
      }
    | 'center';

/**
 * @see {@link ViewOrigin}
 */
export type ViewOriginKeywordX = 'left' | 'center' | 'right';

/**
 * @see {@link ViewOrigin}
 */
export type ViewOriginKeywordY = 'top' | 'center' | 'bottom';

/**
 * A simpler version of {@link ViewOrigin} without any helpful keywords.
 * Both x and y are defined and numbers.
 *
 */
export type ResolvedViewOrigin = {
    readonly x: number;
    readonly y: number;
};

/**
 * A FixedView completely defines which area of the plane is visible. Both width and height are
 * specified so if the aspect ratio of your view is not the same of the canvas you are projecting to
 * you will experience stretching on one axis.
 *
 * @property x The x coordinate of the view
 * @property y The y coordinate of the view
 * @property w The width of the view
 * @property h The height of the view
 * @property origin Where (x, y) lies with respect to the view (see {@link ViewOrigin})
 */
export type FixedView = {
    readonly origin?: ViewOrigin;
    readonly x: number;
    readonly y: number;
    readonly w: number;
    readonly h: number;
};

/**
 * A FixedWidthView only specifies the origin and the width of the view. The height is calculated
 * according to the aspect ratio of the projection. This means that neither axis is stretched.
 *
 * @property x The x coordinate of the view
 * @property y The y coordinate of the view
 * @property w The width of the view
 * @property origin Where (x, y) lies with respect to the view (see {@link ViewOrigin})
 */
export type FixedWidthView = {
    readonly origin?: ViewOrigin;
    readonly x: number;
    readonly y: number;
    readonly w: number;
};

/**
 * A FixedWidthView only specifies the origin and the height of the view. The width is calculated
 * according to the aspect ratio of the projection. This means that neither axis is stretched.
 *
 * @property x The x coordinate of the view
 * @property y The y coordinate of the view
 * @property h The height of the view
 * @property origin Where (x, y) lies with respect to the view (see {@link ViewOrigin})
 */
export type FixedHeightView = {
    readonly origin?: ViewOrigin;
    readonly x: number;
    readonly y: number;
    readonly h: number;
};

/**
 * @see
 */
export type View = FixedView | FixedWidthView | FixedHeightView;

/**
 * The origin (x, y) of the ViewRect is in the bottom left.
 */
export type ViewRect = {
    readonly x: number;
    readonly y: number;
    readonly w: number;
    readonly h: number;
};

/**
 * Converts the {@link ViewOrigin} keywords to actual numbers in the range of 0 to 1.
 */
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

/**
 * Calculates a {@link ViewRect} from the given {@link View}. You need to specify the width and
 * height of the projection in case the view is a {@link FixedWidthView} or {@link FixedHeightView}
 * and either width or height need to be calculated dynamically.
 */
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

/**
 * Translates the given view by the given amount along the x and y axis respectively.
 */
export function translateView(view: View, x: number, y: number): View {
    return Object.assign({}, view, {
        x: view.x + x,
        y: view.y + y,
    });
}

/**
 * Scales the given view by the given amount about the {@link ViewOrigin} of the View.
 *
 * @param view The view you want to scale
 * @param scale_x The amount to scale the x axis by
 * @param scale_y The amount to scale the y axis by. If this is not defined, scale_x is also used
 *                for the y axis, preserving the aspect ratio of the view.
 */
export function scaleView(view: View, scale_x: number, scale_y?: number): View {
    const sx = scale_x;
    const sy = scale_y ?? sx;
    const { x, y } = view;
    const resolved_origin = view.origin ? resolveViewOrigin(view.origin) : { x: 0, y: 0 };

    if ('w' in view && 'h' in view) {
        const new_view = { x, y, w: view.w * sx, h: view.h * sy, origin: view.origin };
        new_view.x -= new_view.w * resolved_origin.x;
        new_view.y -= new_view.w * resolved_origin.y;
        return new_view;
    } else if ('w' in view) {
        const new_view = { x, y, w: view.w * sx, origin: view.origin };
        new_view.x -= view.w * new_view.w * resolved_origin.x;
        return new_view;
    } else if ('h' in view) {
        const new_view = { x, y, h: view.h * sy, origin: view.origin };
        new_view.y -= view.h * new_view.h * resolved_origin.y;
        return new_view;
    } else {
        throw new Error('unreachable');
    }
}

/**
 * Generate a {@link FixedView} from the given bounds, where
 * - left ≤ x ≤ right
 * - bottom ≤ y ≤ top
 */
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
