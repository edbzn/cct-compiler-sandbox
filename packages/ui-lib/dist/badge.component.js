import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import * as i0 from "@angular/core";
export class LibBadgeComponent {
    text = input('', /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "text" }] : /* istanbul ignore next */ []));
    strong = input(false, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "strong" }] : /* istanbul ignore next */ []));
    upper = computed(() => this.text().toUpperCase(), /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "upper" }] : /* istanbul ignore next */ []));
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "22.2.0", ngImport: i0, type: LibBadgeComponent, deps: [], target: i0.ɵɵFactoryTarget.Component });
    static ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "17.1.0", version: "22.2.0", type: LibBadgeComponent, isStandalone: true, selector: "lib-badge", inputs: { text: { classPropertyName: "text", publicName: "text", isSignal: true, isRequired: false, transformFunction: null }, strong: { classPropertyName: "strong", publicName: "strong", isSignal: true, isRequired: false, transformFunction: null } }, ngImport: i0, template: `<span class="badge" [class.badge--strong]="strong()" data-cy="lib-badge">{{ upper() }}</span>`, isInline: true, styles: [".badge { color: rgb(10, 20, 30); } .badge--strong { font-weight: 700; }"], changeDetection: i0.ChangeDetectionStrategy.OnPush });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "22.2.0", ngImport: i0, type: LibBadgeComponent, decorators: [{
            type: Component,
            args: [{ selector: 'lib-badge', template: `<span class="badge" [class.badge--strong]="strong()" data-cy="lib-badge">{{ upper() }}</span>`, changeDetection: ChangeDetectionStrategy.OnPush, styles: [".badge { color: rgb(10, 20, 30); } .badge--strong { font-weight: 700; }"] }]
        }], propDecorators: { text: [{ type: i0.Input, args: [{ isSignal: true, alias: "text", required: false }] }], strong: [{ type: i0.Input, args: [{ isSignal: true, alias: "strong", required: false }] }] } });
