import { h, VNode, VNodeChild, VNodeProperties } from 'maquette';

declare global {
    namespace JSX {
        // The return type of our JSX Factory: this could be anything
        export type Element = VNode;

        // IntrinsicElementMap grabs all the standard HTML tags in the TS DOM lib.
        export interface IntrinsicElements extends IntrinsicElementMap {}

        export type Tag = keyof HTMLElementTagNameMap;

        export type IntrinsicElementMap = {
            [K in keyof HTMLElementTagNameMap]: {
                [k: string]: any;
            };
        };

        export interface Component {
            (properties?: { [key: string]: any }, children?: VNodeChild[]): VNode;
        }
    }
}

export function jsxCreateElement(
    tag: JSX.Tag | JSX.Component,
    attributes: VNodeProperties,
    ...children: VNodeChild[]
): JSX.Element {
    if (typeof tag === 'string') {
        return h(tag, attributes ?? {}, children);
    } else {
        return tag(attributes, children);
    }
}
