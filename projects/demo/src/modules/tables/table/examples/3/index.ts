import {Component} from '@angular/core';
import {ValidatorFn} from '@angular/forms';
import {changeDetection} from '@demo/emulate/change-detection';
import {encapsulation} from '@demo/emulate/encapsulation';
import {TuiComparator, tuiDefaultSort} from '@taiga-ui/addon-table';
import {TuiDay} from '@taiga-ui/cdk';

interface Item {
    readonly name: string;
    readonly price: number;
    readonly quantity: number;
    readonly unit: string;
    readonly date: TuiDay;
}

@Component({
    selector: `tui-table-example-3`,
    templateUrl: `./index.html`,
    styleUrls: [`./index.less`],
    changeDetection,
    encapsulation,
})
export class TuiTableExample3 {
    readonly options = {updateOn: `blur`} as const;

    readonly units = [`items`, `kg`, `m`];

    pythons: readonly Item[] = [
        {
            name: `Holy Grail`,
            price: 999999,
            quantity: 1,
            unit: this.units[0],
            date: TuiDay.currentLocal(),
        },
        {
            name: `Foot`,
            price: 29.95,
            quantity: 5,
            unit: this.units[2],
            date: TuiDay.currentLocal().append({day: -42}),
        },
        {
            name: `Shed`,
            price: 499,
            quantity: 2,
            unit: this.units[0],
            date: TuiDay.currentLocal().append({day: -237}),
        },
    ];

    starwars: readonly Item[] = [
        {
            name: `Lightsaber`,
            price: 4999,
            quantity: 3,
            unit: this.units[0],
            date: TuiDay.currentLocal(),
        },
        {
            name: `Spaceship`,
            price: 19999,
            quantity: 1,
            unit: this.units[0],
            date: TuiDay.currentLocal().append({day: -237}),
        },
        {
            name: `Stormtrooper helmet`,
            price: 14.95,
            quantity: 5,
            unit: this.units[0],
            date: TuiDay.currentLocal().append({day: -42}),
        },
    ];

    readonly columns = [`name`, `price`, `quantity`, `unit`, `total`] as const;

    readonly minPrice: ValidatorFn = ({value}) =>
        value > 400 ? null : {minPrice: `Price must be above $400`};

    readonly totalSorter: TuiComparator<Item> = (a, b) =>
        tuiDefaultSort(a.price * a.quantity, b.price * b.quantity);

    trackByIndex(index: number): number {
        return index;
    }

    getTotal({price, quantity}: Item): number {
        return price * quantity;
    }

    onValueChange<K extends keyof Item>(
        value: Item[K],
        key: K,
        current: Item,
        data: readonly Item[],
    ): void {
        const updated = {...current, [key]: value};

        this.pythons =
            data === this.pythons
                ? this.pythons.map(item => (item === current ? updated : item))
                : this.pythons;

        this.starwars =
            data === this.starwars
                ? this.starwars.map(item => (item === current ? updated : item))
                : this.starwars;
    }
}
