import {Location as NgLocation} from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    HostListener,
    Inject,
    Input,
    NgZone,
    Optional,
    QueryList,
    ViewChildren,
} from '@angular/core';
import {LOCATION} from '@ng-web-apis/common';
import {TuiLineChartHintContext} from '@taiga-ui/addon-charts/interfaces';
import {tuiDraw, tuiPrepareExternalUrl} from '@taiga-ui/addon-charts/utils';
import {
    EMPTY_QUERY,
    tuiDefaultProp,
    TuiIdService,
    tuiInRange,
    tuiIsPresent,
    tuiPure,
    TuiStringHandler,
    tuiZoneOptimized,
} from '@taiga-ui/cdk';
import {
    TuiDriver,
    TuiHintOptionsDirective,
    tuiHintOptionsProvider,
    TuiPoint,
} from '@taiga-ui/core';
import {PolymorpheusContent} from '@tinkoff/ng-polymorpheus';
import {Observable, Subject} from 'rxjs';
import {distinctUntilChanged} from 'rxjs/operators';

// TODO: find the best way for prevent cycle
// eslint-disable-next-line import/no-cycle
import {TuiLineChartHintDirective} from './line-chart-hint.directive';

@Component({
    selector: `tui-line-chart`,
    templateUrl: `./line-chart.template.html`,
    styleUrls: [`./line-chart.style.less`],
    changeDetection: ChangeDetectionStrategy.OnPush,
    viewProviders: [tuiHintOptionsProvider({direction: `top`})],
})
export class TuiLineChartComponent {
    private readonly _hovered$ = new Subject<number>();

    private readonly autoIdString: string;

    @ViewChildren(TuiDriver)
    readonly drivers: QueryList<Observable<boolean>> = EMPTY_QUERY;

    @Input(`value`)
    @tuiDefaultProp()
    set valueSetter(value: readonly TuiPoint[]) {
        this.value = value.filter(item => !item.some(Number.isNaN));
    }

    @Input()
    @tuiDefaultProp()
    x = 0;

    @Input()
    @tuiDefaultProp()
    y = 0;

    @Input()
    @tuiDefaultProp()
    width = 0;

    @Input()
    @tuiDefaultProp()
    height = 0;

    @Input()
    @tuiDefaultProp(
        (smoothingFactor: number) => tuiInRange(smoothingFactor, 0, 100),
        `smoothingFactor must be between 0 and 100`,
    )
    smoothingFactor = 0;

    @Input()
    @tuiDefaultProp()
    xStringify: TuiStringHandler<number> | null = null;

    @Input()
    @tuiDefaultProp()
    yStringify: TuiStringHandler<number> | null = null;

    @Input()
    @tuiDefaultProp()
    filled = false;

    @Input()
    @tuiDefaultProp()
    dots = false;

    value: readonly TuiPoint[] = [];

    constructor(
        @Inject(TuiIdService) idService: TuiIdService,
        @Inject(NgZone) private readonly ngZone: NgZone,
        @Inject(NgLocation) private readonly ngLocation: NgLocation,
        @Inject(LOCATION) private readonly locationRef: Location,
        @Optional()
        @Inject(TuiLineChartHintDirective)
        readonly hintDirective: TuiLineChartHintDirective | null,
        @Optional()
        @Inject(TuiHintOptionsDirective)
        readonly hintOptions: TuiHintOptionsDirective | null,
    ) {
        this.autoIdString = idService.generate();
    }

    @tuiPure
    get hovered$(): Observable<number> {
        return this._hovered$.pipe(distinctUntilChanged(), tuiZoneOptimized(this.ngZone));
    }

    get hintContent(): PolymorpheusContent<TuiLineChartHintContext<TuiPoint>> {
        return this.hintOptions?.content || ``;
    }

    get fillId(): string {
        return `tui-line-chart-${this.autoIdString}`;
    }

    get fill(): string {
        return this.filled
            ? tuiPrepareExternalUrl(this.ngLocation, this.locationRef, this.fillId)
            : `none`;
    }

    get viewBox(): string {
        return `${this.x} ${this.y} ${this.width} ${this.height}`;
    }

    get d(): string {
        return this.getD(this.value, this.smoothingFactor);
    }

    get fillD(): string {
        return this.value.length
            ? `${this.d}V ${this.y} H ${this.value[0][0]} V ${this.value[0][1]}`
            : this.d;
    }

    get isFocusable(): boolean {
        return !this.hintDirective && this.hasHints;
    }

    get hasHints(): boolean {
        return (
            !!this.xStringify ||
            !!this.yStringify ||
            !!this.hintDirective?.hint ||
            !!this.hintContent
        );
    }

    @HostListener(`mouseleave`)
    onMouseLeave(): void {
        if (!this.hintDirective) {
            this.onHovered(NaN);
        }
    }

    getX(index: number): number {
        if (this.isSinglePoint) {
            return this.value[0][0] / 2;
        }

        return index
            ? (this.value[index - 1][0] + this.value[index][0]) / 2
            : 2 * this.value[0][0] - this.getX(1);
    }

    getWidth(index: number): number {
        return (100 * this.computeWidth(index)) / this.width;
    }

    getHintId(index: number): string {
        return `${this.autoIdString}_${index}`;
    }

    getContentContext(
        $implicit: TuiPoint,
        index: number,
    ): TuiLineChartHintContext<TuiPoint | readonly TuiPoint[]> {
        return (
            this.hintDirective?.getContext(this.value.indexOf($implicit), this) || {
                $implicit,
                index,
            }
        );
    }

    getHovered(hovered: number | null): TuiPoint | null {
        // This checks for NaN and null too since async pipe returns null before first item
        return tuiIsPresent(hovered) && Number.isInteger(hovered)
            ? this.value[hovered]
            : null;
    }

    getBottom(y: number): number {
        return (100 * (y - this.y)) / this.height;
    }

    getLeft(x: number): number {
        return (100 * (x - this.x)) / this.width;
    }

    getOffset(x: number): number {
        return (100 * (this.value[x][0] - this.getX(x))) / this.computeWidth(x);
    }

    onMouseEnter(index: number): void {
        if (this.hintDirective) {
            this.hintDirective.raise(index, this);
        } else {
            this.onHovered(index);
        }
    }

    onHovered(index: number): void {
        this._hovered$.next(index);
    }

    private get isSinglePoint(): boolean {
        return this.value.length === 1;
    }

    @tuiPure
    private getD(value: readonly TuiPoint[], smoothingFactor: number): string {
        return value.reduce(
            (d, point, index) =>
                index ? `${d} ${tuiDraw(value, index, smoothingFactor)}` : `M ${point}`,
            ``,
        );
    }

    private computeWidth(index: number): number {
        return index === this.value.length - 1
            ? 2 * (this.value[index][0] - this.getX(index))
            : this.getX(index + 1) - this.getX(index);
    }
}
