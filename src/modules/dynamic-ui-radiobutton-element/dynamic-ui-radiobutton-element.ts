import {bindable} from 'aurelia-framework';
import {IEnumFormField} from '../../contracts';

export class DynamicUiRadioButtonElement {
  @bindable()
  public field: IEnumFormField;

  public activate(field: IEnumFormField): void {
    this.field = field;

    const fieldHasNoValues: boolean = this.field.value === undefined || this.field.value === '';

    if (fieldHasNoValues) {
      this.field.value = this.field.defaultValue;
    }
  }
}
