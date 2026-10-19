import { Component, input } from '@angular/core';
import * as i0 from "@angular/core";
export class LibAvatarComponent {
    src = input('', /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "src" }] : /* istanbul ignore next */ []));
    alt = input('avatar', /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "alt" }] : /* istanbul ignore next */ []));
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.2.0", ngImport: i0, type: LibAvatarComponent, deps: [], target: i0.ɵɵFactoryTarget.Component });
    static ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "17.1.0", version: "22.2.0", type: LibAvatarComponent, isStandalone: true, selector: "lib-avatar", inputs: { src: { classPropertyName: "src", publicName: "src", isSignal: true, isRequired: false, transformFunction: null }, alt: { classPropertyName: "alt", publicName: "alt", isSignal: true, isRequired: false, transformFunction: null } }, ngImport: i0, template: `<img data-cy="lib-avatar" [src]="src()" [alt]="alt()" width="16" height="16" />`, isInline: true });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.2.0", ngImport: i0, type: LibAvatarComponent, decorators: [{
            type: Component,
            args: [{
                    selector: 'lib-avatar',
                    template: `<img data-cy="lib-avatar" [src]="src()" [alt]="alt()" width="16" height="16" />`,
                }]
        }], propDecorators: { src: [{ type: i0.Input, args: [{ isSignal: true, alias: "src", required: false }] }], alt: [{ type: i0.Input, args: [{ isSignal: true, alias: "alt", required: false }] }] } });
