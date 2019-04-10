import { formatDate } from '@angular/common';
import { ValidatorFn, AbstractControl, FormControl, FormGroup } from '@angular/forms';
import * as _moment from 'moment';

export class FormBase {
  form: FormGroup;

  isFieldValid(field: string) {
    let formField = this.form.get(field);
    if (formField == null)
      return true;

    return this.form.get(field).valid || !this.form.get(field).touched;
  }

  isValidOrNotTouched(field: string) {
    return this.form.get(field).valid || !this.form.get(field).touched;
  }

  public rejectIfNotDigitOrBackSpace(event) {
    const acceptedKeys = ['Backspace', 'Tab', 'End', 'Home', 'ArrowLeft', 'ArrowRight', 'Control',
      '1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
    if (acceptedKeys.indexOf(event.key) === -1) {
      event.preventDefault();
    }
  }

  public customRequiredCheckboxValidator(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
      if (control.value === true) {
        return null;
      } else {
        return { 'shouldBeTrue': 'But value is false' };
      }
    };
  }

  public customZipCodeValidator(pattern: RegExp, countryField: string): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
      if (!control.parent) {
        return null;
      }
      const country = control.parent.get(countryField).value;
      if (country !== 'Canada' && country !== 'United States of America') {
        return null;
      }
      const valueMatchesPattern = pattern.test(control.value);
      return valueMatchesPattern ? null : { 'regex-missmatch': { value: control.value } };
    };
  }

  public requiredCheckboxGroupValidator(checkboxFields: string[]): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
      if (!control.parent) {
        return null;
      }
      let valid = false;
      checkboxFields.forEach(f => {
        valid = valid || control.parent.get(f).value;
      });
      return valid ? null : { 'required-set': { value: control.value } };
    };
  }

  public requiredCheckboxChildValidator(checkboxField: string): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
      if (!control.parent || !control.parent.get(checkboxField)) {
        return null;
      }
      const parentIsChecked = control.parent.get(checkboxField).value;
      if (!parentIsChecked) {
        return null;
      }
      return control.value ? null : { 'required': { value: control.value } };
    };
  }
  
  validateAllFormFields(formGroup: any) {
    Object.keys(formGroup.controls).forEach(field => {
      const control = formGroup.get(field);

      if (control instanceof FormControl) {
        control.markAsTouched({ onlySelf: true });
      } else if (control instanceof FormGroup) {
        this.validateAllFormFields(control);
      }
    });
  }

  getErrors(formGroup: any, errors: any = {}) {
    Object.keys(formGroup.controls).forEach(field => {
      const control = formGroup.get(field);
      if (control instanceof FormControl) {
        errors[field] = control.errors;
      } else if (control instanceof FormGroup) {
        errors[field] = this.getErrors(control);
      }
    });
    return errors;
  }

  orEmpty(amI: FormControl): string {
    if (amI == null || amI === undefined)
      return "--";

    if (amI.value.length == 0)
      return "--";

    return amI.value;
  }

  isChildFieldValid(parent: string, field: string) {
    let formField = this.form.get(parent);
    if (formField == null)
      return true;

    return formField.get(field).valid || !formField.get(field).touched;
  }

  controlsHaveValueCheck(controlKeys: Array<string>, formGroup: FormGroup): Array<boolean> {
    return controlKeys.map((item) => {
      // reset any errors already set (ON ALL GIVEN KEYS).
      formGroup.controls[item].setErrors(null);

      // Checks for empty string and empty array.
      let hasValue = (formGroup.controls[item].value instanceof Array) ? formGroup.controls[item].value.length > 0 :
        !(formGroup.controls[item].value === "");
      return (hasValue) ? false : true;
    });
  }

  conditionalAnyRequired(controlKeys: Array<string>): ValidatorFn {
    return (control: FormControl): { [key: string]: any } => {
      let formGroup = control.root;
      if (formGroup instanceof FormGroup) {

        // Only check if all FormControls are siblings(& present on the nearest FormGroup)
        if (controlKeys.every((item) => {
          return formGroup.get(item) != null;
        })) {
          let result = this.controlsHaveValueCheck(controlKeys, formGroup);

          // If any item is valid return null, if all are invalid return required error.
          return (result.some((item) => {
            return item === false;
          })) ? null : { required: true };
        }
      }
      return null;
    }
  }


  public hasValueSet(controlName: string): boolean {
    var control = this.form.get(controlName);

    if (control == null || control === undefined)
      return false;

    if (control.value == null || control.value === undefined)
      return false;

    if (control.value.length == 0 || control.value.length === undefined)
      return false;

    return control.value.length > 0;
  }

  public hasSignature(controlName: string): boolean {
    return this.hasValueSet(controlName);
  }

  public requiredSelectChildValidator(selectField: string, conditionalValue: any[]): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
      if (!control.parent
        || !control.parent.get(selectField)
        || conditionalValue.indexOf(control.parent.get(selectField).value) === -1) {
        return null;
      }
      const parentIsChecked = control.parent.get(selectField).value;
      if (!parentIsChecked) {
        return null;
      }
      return control.value ? null : { 'required': { value: control.value } };
    };
  }

  // Requires you to use the [InnerHTML] property on an element rather than {{ }} interpolation
  public checkmarkOrEmpty(controlName: string): string {
    var control = this.form.get(controlName);

    if (control.value === true)
      return '<i class="fa fa-check"> </i>';
    return '--';
  }

  public valueOrEmpty(controlName: any, emptyValue = '--'): string {
    let control = null;

    if (typeof (controlName) == 'string')
      control = this.form.get(controlName);

    if (controlName instanceof FormGroup)
      control = controlName;

    if (controlName instanceof FormControl)
      control = controlName;

    if (control == null || control === undefined)
      return emptyValue;

    if (control.value == null || control.value === undefined)
      return emptyValue;

    var value = control.value;
    
    if (typeof(value) == 'string' && value.length == 0)
      return emptyValue;

    if (typeof(value) == 'number' && value == 0) {
      return emptyValue;
    }

    if (typeof(value) == 'boolean') {
      return value ? 'Yes' : 'No';
    }

    return control.value;
  }

  public valueForEnum(controlName: string): number {
    var control = this.form.get(controlName);

    if (control == null || control === undefined || control.value == null || control.value === undefined)
      return 0;

    var value = control.value;
    if (typeof (value) == 'string') {
      if (!isNaN(parseFloat(value)) && isFinite(+value)) {
        return parseInt(value);
      }
      else {
        return 0
      }
    }

    if (typeof (value) !== 'number') {
      return 0;
    }

    return control.value;
  }

  public multiValueOrEmpty(values: Array<string>): string {
    var output = [];

    for (var i = 0; i < values.length; i++) {
      var control = this.valueOrEmpty(values[i]);

      if (control !== "--")
        output.push(control);
    }

    return output.join(' ');
  }
      
  public datesOrEmpty(values: Array<string>): string {
    var output = [];
    for (var i = 0; i < values.length; i++) {
      var control = this.valueOrEmpty(values[i]);

      if (control !== "--") {
        let formattedDate = _moment(control).format('MMM Do, Y');
        output.push(formattedDate);
      }
    }

    if (output.length == 0)
      return '--';

    return output.join(' - ');
  }

  public formatSin(sin1: string, sin2: string, sin3: string): string {
    var control1 = this.valueOrEmpty(sin1);
    var control2 = this.valueOrEmpty(sin1);
    var control3 = this.valueOrEmpty(sin1);

    if (control1 == '--' || control2 == '--' || control3 == '--')
      return '--';

    return control1 + '-' + control2 + '-' + control3;
  }

  public displayMailingAddress(addressControl: any): string {
    let control = null;

    if (typeof(addressControl) == 'string')
      control = this.form.get(addressControl);

    if (addressControl instanceof FormGroup)
      control = addressControl;

    if (control == null || control === undefined)
      return "--";

    let line1 = control.get('line1').value || '';
    let line2 = control.get('line2').value || '';
    let city = control.get('city').value || '';
    let postalCode = control.get('postalCode').value || '';
    let province = control.get('province').value || '';
    let country = control.get('country').value || '';

    let address = line1 + '<br />';
    if (line2 != '')
      address += line2 + '<br />';
    if (city != '')
      address += city + '<br />';
    if (province != '')
      address += province + '<br />';
    if (country != '')
      address += country + '<br />';
    if (postalCode != '')
      address += postalCode;

    return address;
  }

  public trimValue(control: FormControl) {
    const value = control.value;
    control.setValue('');
    control.setValue(value.trim());
  }

  copyPersonalAddressToVictimAddress() {
    let copyAddress = this.form.get('victimInformation.mostRecentMailingAddressSameAsPersonal').value === true;
    let target = this.form.get('victimInformation.primaryAddress');
    let source = this.form.get('personalInformation.primaryAddress');

    if (copyAddress) {
      target.get('line1').patchValue(source.get('line1').value);
      target.get('line2').patchValue(source.get('line2').value);
      target.get('city').patchValue(source.get('city').value);
      target.get('postalCode').patchValue(source.get('postalCode').value);
      target.get('province').patchValue(source.get('province').value);
      target.get('country').patchValue(source.get('country').value);

      target.get('line1').disable();
      target.get('line2').disable();
      target.get('city').disable();
      target.get('postalCode').disable();
      target.get('province').disable();
      target.get('country').disable();
    }
    else {
      target.get('line1').enable();
      target.get('line2').enable();
      target.get('city').enable();
      target.get('postalCode').enable();
      target.get('province').enable();
      target.get('country').enable();
    }
  }
}
// More custom validation
// https://stackoverflow.com/questions/38204812/angular2-forms-validator-with-interrelated-fields/40416197#40416197
