import {bindable} from 'aurelia-framework';
import {IBooleanFormField} from '../../contracts/index';

export class DynamicUiCheckboxElement {
  @bindable()
  public field: IBooleanFormField;

  public activate(field: IBooleanFormField): void {
    this.field = field;

    const fieldHasNoValue: boolean = this.field.value === undefined;

    if (fieldHasNoValue) {
      this.field.value = this.field.defaultValue === 'true' || this.field.defaultValue === '1';
    }
  }
}
