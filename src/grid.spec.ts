import test from 'ava';
import { generateStops } from './grid';

function approxEqual(a: number, b: number, epsilon: number = Number.EPSILON): true {
    const diff = Math.abs(a - b);
    const eql = diff <= epsilon;

    if (!eql) {
        throw new Error(
            `Expected the numbers ${a} and ${b} to have a difference smaller than or equal to ${epsilon}, but the actual difference is ${diff}`,
        );
    }

    return true;
}

test('generateStops', (t) => {
    type Entry = {
        from: number;
        to: number;
        expected: number[];
    };

    const entries: Entry[] = [
        {
            from: 0,
            to: 0.1,
            expected: [0, 0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09, 0.1],
        },
        {
            from: 0,
            to: 1,
            expected: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
        },
        {
            from: 0,
            to: 10,
            expected: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        },
        {
            from: 0,
            to: 100,
            expected: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
        },
    ];

    for (const entry of entries) {
        const stops = generateStops(entry.from, entry.to);

        t.is(stops.length, entry.expected.length, 'A different amount of stops was generated than expected');

        for (let i = 0; i < entry.expected.length; i++) {
            const expected = entry.expected[i];
            const actual = stops[i];

            t.truthy(approxEqual(expected, actual, 0.0000001));
        }
    }
});
