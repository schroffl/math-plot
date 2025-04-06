import test from 'ava';
import {
    getViewRect,
    ResolvedViewOrigin,
    resolveViewOrigin,
    scaleView,
    translateView,
    View,
    ViewOrigin,
    ViewRect,
} from './view';

test('resolveViewOrigin', (t) => {
    type Entry = {
        input: ViewOrigin;
        expected: ResolvedViewOrigin;
    };

    const entries: Entry[] = [
        {
            input: { x: 'left', y: 'bottom' },
            expected: { x: 0, y: 0 },
        },
        {
            input: { x: 'left', y: 'center' },
            expected: { x: 0, y: 0.5 },
        },
        {
            input: { x: 'left', y: 'top' },
            expected: { x: 0, y: 1 },
        },

        {
            input: { x: 'center', y: 'bottom' },
            expected: { x: 0.5, y: 0 },
        },
        {
            input: { x: 'center', y: 'center' },
            expected: { x: 0.5, y: 0.5 },
        },
        {
            input: { x: 'center', y: 'top' },
            expected: { x: 0.5, y: 1 },
        },

        {
            input: { x: 'right', y: 'bottom' },
            expected: { x: 1, y: 0 },
        },
        {
            input: { x: 'right', y: 'center' },
            expected: { x: 1, y: 0.5 },
        },
        {
            input: { x: 'right', y: 'top' },
            expected: { x: 1, y: 1 },
        },

        {
            input: { x: 0.9, y: 'top' },
            expected: { x: 0.9, y: 1 },
        },
        {
            input: { x: 'right', y: 0.9 },
            expected: { x: 1, y: 0.9 },
        },
        {
            input: { x: 0.125, y: 0.25 },
            expected: { x: 0.125, y: 0.25 },
        },

        {
            input: 'center',
            expected: { x: 0.5, y: 0.5 },
        },
    ];

    for (const entry of entries) {
        const result = resolveViewOrigin(entry.input);

        t.is(result.x, entry.expected.x);
        t.is(result.y, entry.expected.y);
    }
});

test('getViewRect', (t) => {
    type Entry = {
        input: View;
        width: number;
        height: number;
        expected: ViewRect;
    };

    const entries: Entry[] = [
        {
            input: { x: 0, y: 0, w: 10, h: 10 },
            width: 1920,
            height: 1080,
            expected: { x: 0, y: 0, w: 10, h: 10 },
        },
        {
            input: { x: 0, y: 0, w: 10, h: 10, origin: { x: 'center', y: 'center' } },
            width: 1920,
            height: 1080,
            expected: { x: -5, y: -5, w: 10, h: 10 },
        },
        {
            input: { x: 0, y: 0, w: 10 },
            width: 1920,
            height: 1080,
            expected: { x: 0, y: 0, w: 10, h: 5.625 },
        },
        {
            input: { x: 0, y: 0, w: 10 },
            width: 100,
            height: 100,
            expected: { x: 0, y: 0, w: 10, h: 10 },
        },
        {
            input: { x: -20, y: 20, h: 10, origin: { x: 'right', y: 'center' } },
            width: 1900,
            height: 1000,
            expected: { x: -39, y: 15, w: 19, h: 10 },
        },
    ];

    for (const entry of entries) {
        const view_rect = getViewRect(entry.input, entry.width, entry.height);

        t.is(view_rect.x, entry.expected.x);
        t.is(view_rect.y, entry.expected.y);
        t.is(view_rect.w, entry.expected.w);
        t.is(view_rect.h, entry.expected.h);
    }
});

test('translateView', (t) => {
    type Entry = {
        input: View;
        x: number;
        y: number;
        expected: View;
    };

    const entries: Entry[] = [
        {
            input: { x: 0, y: 0, w: 1, h: 1 },
            x: 1,
            y: -3,
            expected: { x: 1, y: -3, w: 1, h: 1 },
        },
    ];

    for (const entry of entries) {
        const result = translateView(entry.input, entry.x, entry.y);

        t.deepEqual(result, entry.expected);
    }
});

test('scaleView', (t) => {
    type Entry = {
        input: View;
        scale: number;
        expected: View;
    };

    const entries: Entry[] = [
        {
            input: { x: -1, y: 1, w: 1, h: 1, origin: { x: 'left', y: 0.5 } },
            scale: 2,
            expected: { x: -1, y: 0, w: 2, h: 2, origin: { x: 'left', y: 0.5 } },
        },
        {
            input: { x: 0, y: 0, w: 1, h: 1, origin: 'center' },
            scale: 2,
            expected: { x: -1, y: -1, w: 2, h: 2, origin: 'center' },
        },
        {
            input: { x: 0, y: 0, w: 1, origin: 'center' },
            scale: 2,
            expected: { x: -1, y: 0, w: 2, origin: 'center' },
        },
        {
            input: { x: 0, y: 0, h: 1, origin: 'center' },
            scale: 2,
            expected: { x: 0, y: -1, h: 2, origin: 'center' },
        },
    ];

    for (const entry of entries) {
        const result = scaleView(entry.input, entry.scale);

        t.deepEqual(result, entry.expected);
    }
});
