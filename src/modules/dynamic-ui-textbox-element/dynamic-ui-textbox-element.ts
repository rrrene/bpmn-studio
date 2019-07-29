import {bindable} from 'aurelia-framework';
import {IStringFormField} from '../../contracts';

export class DynamicUiTextboxElement {
  @bindable()
  public field: IStringFormField;

  public activate(field: IStringFormField): void {
    this.field = field;

    const fieldValueIsNotSet: boolean = this.field.value === undefined || this.field.value === '';

    if (fieldValueIsNotSet) {
      this.field.value = this.field.defaultValue;
    }
  }
}
