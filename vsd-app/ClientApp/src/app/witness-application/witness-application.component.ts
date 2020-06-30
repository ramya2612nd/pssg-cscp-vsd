import { Component, OnInit } from '@angular/core';
import { User } from '../models/user.model';
import { FormBuilder, FormGroup, Validators, FormArray, FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatStepper } from '@angular/material/stepper';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import * as _moment from 'moment';
// tslint:disable-next-line:no-duplicate-imports
import { defaultFormat as _rollupMoment } from 'moment';
import { MatSnackBar, MatDialog, MatDialogConfig } from '@angular/material';

import { SignPadDialog } from '../sign-dialog/sign-dialog.component';
import { SummaryOfBenefitsDialog } from '../summary-of-benefits/summary-of-benefits.component';
import { CancelApplicationDialog } from '../shared/cancel-dialog/cancel-dialog.component';
import { JusticeApplicationDataService } from '../services/justice-application-data.service';
import { FormBase } from '../shared/form-base';
import { HOSPITALS } from '../shared/hospital-list';
import { EnumHelper, ApplicationType } from '../shared/enums-list';
import { MY_FORMATS } from '../shared/enums-list';
import { Application, Introduction, PersonalInformation, CrimeInformation, MedicalInformation, ExpenseInformation, EmploymentIncomeInformation, RepresentativeInformation, DeclarationInformation, AuthorizationInformation, VictimInformation } from '../interfaces/application.interface';
import { COUNTRIES_ADDRESS } from '../shared/address/country-list';
import { CrimeInfoHelper } from '../shared/crime-information/crime-information.helper';
import { MedicalInfoHelper } from '../shared/medical-information/medical-information.helper';
import { AuthInfoHelper } from '../shared/authorization-information/authorization-information.helper';
import { POSTAL_CODE } from '../shared/regex.constants';
import { VictimInfoHelper } from '../shared/victim-information/victim-information.helper';
import { PersonalInfoHelper } from '../shared/personal-information/personal-information.helper';
import { RepresentativeInfoHelper } from '../shared/representative-information/representative-information.helper';

const moment = _rollupMoment || _moment;

@Component({
  selector: 'app-witness-application',
  templateUrl: './witness-application.component.html',
  styleUrls: ['./witness-application.component.scss'],
  providers: [
    // `MomentDateAdapter` can be automatically provided by importing `MomentDateModule` in your
    // application's root module. We provide it at the component level here, due to limitations of
    // our example generation script.
    { provide: DateAdapter, useClass: MomentDateAdapter, deps: [MAT_DATE_LOCALE] },
    { provide: MAT_DATE_FORMATS, useValue: MY_FORMATS },
  ],
})

export class WitnessApplicationComponent extends FormBase implements OnInit {
  FORM_TYPE: ApplicationType = ApplicationType.Witness_Application;
  postalRegex = POSTAL_CODE;
  currentUser: User;
  dataLoaded = false;
  busy: Promise<any>;
  busy2: Promise<any>;
  busy3: Promise<any>;
  form: FormGroup;
  formFullyValidated: boolean;
  showValidationMessage: boolean;
  submitting: boolean = false; // this controls the button state for

  hospitalList = HOSPITALS;
  provinceList: string[];
  relationshipList: string[];
  enumHelper = new EnumHelper();

  public currentFormStep: number;

  saveFormData: any;

  ApplicationType = ApplicationType;

  get preferredMethodOfContact() { return this.form.get('personalInformation.preferredMethodOfContact'); }

  personalInfoHelper = new PersonalInfoHelper();
  victimInfoHelper = new VictimInfoHelper();
  crimeInfoHelper = new CrimeInfoHelper();
  medicalInfoHelper = new MedicalInfoHelper();
  representativeInfoHelper = new RepresentativeInfoHelper();
  authInfoHelper = new AuthInfoHelper();

  constructor(
    private justiceDataService: JusticeApplicationDataService,
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    public snackBar: MatSnackBar,
    private dialog: MatDialog,
  ) {
    super();
    this.formFullyValidated = false;
    this.currentFormStep = 0;
  }

  ngOnInit() {
    let completeOnBehalfOf = this.route.snapshot.queryParamMap.get('ob');
    this.form = this.buildApplicationForm();

    this.form.get('representativeInformation').patchValue({
      completingOnBehalfOf: parseInt(completeOnBehalfOf)
    });

    this.form.get('expenseInformation.missedWorkDueToDeathOfVictim')
      .valueChanges
      .subscribe(value => {
        let didYouLoseWages = this.form.get('expenseInformation.didYouLoseWages');
        let daysWorkMissedStart = this.form.get('expenseInformation.daysWorkMissedStart');
        let mayContactEmployer = this.form.get('expenseInformation.mayContactEmployer');
        let minimumOtherBenefitsSelected = this.form.get('expenseInformation.minimumOtherBenefitsSelected');

        let employerControls = this.form.get('expenseInformation.employers') as FormArray;

        didYouLoseWages.clearValidators();
        didYouLoseWages.setErrors(null);
        daysWorkMissedStart.clearValidators();
        daysWorkMissedStart.setErrors(null);
        mayContactEmployer.clearValidators();
        mayContactEmployer.setErrors(null);
        minimumOtherBenefitsSelected.clearValidators();
        minimumOtherBenefitsSelected.setErrors(null);

        let useValidation = value === true;
        if (useValidation) {
          didYouLoseWages.setValidators([Validators.required]);
          daysWorkMissedStart.setValidators([Validators.required]);
          mayContactEmployer.setValidators([Validators.required]);
          minimumOtherBenefitsSelected.setValidators([Validators.required]);
        }

        for (let employer of employerControls.controls) {
          console.log('Employer Control');
          let employerName = employer.get('employerName');
          let employerPhoneNumber = employer.get('employerPhoneNumber');

          console.log(employerName);
          employerName.clearValidators();
          employerName.setErrors(null);
          employerPhoneNumber.clearValidators();
          employerPhoneNumber.setErrors(null);

          if (useValidation) {
            employerName.setValidators([Validators.required]);
            employerPhoneNumber.setValidators([Validators.required]);
          }
        }

        minimumOtherBenefitsSelected.updateValueAndValidity();
        //  employers: this.fb.array([this.createEmployerItem()]),
      });
  }

  showSignPad(group, control): void {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.disableClose = true;
    dialogConfig.autoFocus = true;

    const dialogRef = this.dialog.open(SignPadDialog, dialogConfig);
    dialogRef.afterClosed().subscribe(
      data => {
        var patchObject = {};
        patchObject[control] = data;
        this.form.get(group).patchValue(
          patchObject
        );
      }
    );
  }

  verifyCancellation(): void {
    const verifyDialogConfig = new MatDialogConfig();
    verifyDialogConfig.disableClose = true;
    verifyDialogConfig.autoFocus = true;
    verifyDialogConfig.data = 'witness';

    const verifyDialogRef = this.dialog.open(CancelApplicationDialog, verifyDialogConfig);
    verifyDialogRef.afterClosed().subscribe(
      data => {
        if (data === true) {
          this.router.navigate(['/application-cancelled']);
          return;
        }
      }
    );
  }

  showSummaryOfBenefits(): void {
    //const summaryDialogConfig = new MatDialogConfig();
    const summaryDialogRef = this.dialog.open(SummaryOfBenefitsDialog, { maxWidth: '800px !important', data: 'witness' });
  }

  getFormGroupName(groupIndex: any) {
    let elements: Array<string> = ['introduction', 'personalInformation', 'victimInformation', 'crimeInformation', 'medicalInformation', 'expenseInformation', 'representativeInformation', 'declarationInformation', 'authorizationInformation'];
    return elements[groupIndex];
  }

  changeBenefitGroupValidity(values: any): void {
    let minimumBenefitsMet = '';
    const x = [
      this.form.get('expenseInformation.haveCounsellingExpenses'),
      this.form.get('expenseInformation.haveCounsellingTransportation'),
      this.form.get('expenseInformation.havePrescriptionDrugExpenses'),
    ];

    let oneChecked = false;
    x.forEach(c => {
      if (oneChecked)
        return;

      if (c instanceof FormControl) {
        if (c.value === true)
          oneChecked = true;
      }
    });

    // fake a 'true' as a string
    minimumBenefitsMet = oneChecked ? 'yes' : '';

    this.form.get('expenseInformation').patchValue({
      minimumBenefitsSelected: minimumBenefitsMet
    });
  }

  changeAdditionalBenefitGroupValidity(values: any): void {
    let minimumBenefitsMet = '';
    const x = [
      this.form.get('expenseInformation.haveCrimeSceneCleaningExpenses'),
      this.form.get('expenseInformation.noneOfTheAboveExpenses'),
    ];

    let oneChecked = false;
    x.forEach(c => {
      if (oneChecked)
        return;

      if (c instanceof FormControl) {
        if (c.value === true)
          oneChecked = true;
      }
    });

    // fake a 'true' as a string
    minimumBenefitsMet = oneChecked ? 'yes' : '';

    this.form.get('expenseInformation').patchValue({
      minimumAdditionalBenefitsSelected: minimumBenefitsMet
    });
  }

  changeOtherBenefitGroupValidity(values: any): void {
    let minimumBenefitsMet = '';
    const x = [
      this.form.get('expenseInformation.haveDisabilityPlanBenefits'),
      this.form.get('expenseInformation.haveEmploymentInsuranceBenefits'),
      this.form.get('expenseInformation.haveIncomeAssistanceBenefits'),
      this.form.get('expenseInformation.haveCanadaPensionPlanBenefits'),
      this.form.get('expenseInformation.haveAboriginalAffairsAndNorthernDevelopmentCanadaBenefits'),
      this.form.get('expenseInformation.haveCivilActionBenefits'),
      this.form.get('expenseInformation.haveOtherBenefits'),
      this.form.get('expenseInformation.noneOfTheAboveBenefits'),
    ];

    let oneChecked = false;
    x.forEach(c => {
      if (oneChecked)
        return;

      if (c instanceof FormControl) {
        if (c.value === true)
          oneChecked = true;
      }
    });

    // fake a 'true' as a string
    minimumBenefitsMet = oneChecked ? 'yes' : '';

    this.form.get('expenseInformation').patchValue({
      minimumOtherBenefitsSelected: minimumBenefitsMet
    });
  }

  gotoPageIndex(stepper: MatStepper, selectPage: number): void {
    window.scroll(0, 0);
    stepper.selectedIndex = selectPage;
    this.currentFormStep = selectPage;
  }

  gotoPage(selectPage: MatStepper): void {
    window.scroll(0, 0);
    this.showValidationMessage = false;
    this.currentFormStep = selectPage.selectedIndex;
  }

  gotoNextStep(stepper: MatStepper): void {
    if (stepper != null) {
      var desiredFormIndex = stepper.selectedIndex;
      var formGroupName = this.getFormGroupName(desiredFormIndex);

      this.formFullyValidated = this.form.valid;

      if (desiredFormIndex >= 0 && desiredFormIndex < 9) {
        var formParts = this.form.get(formGroupName);
        var formValid = true;

        if (formParts != null) {
          formValid = formParts.valid;
        }

        if (formValid) {
          this.showValidationMessage = false;
          window.scroll(0, 0);
          stepper.next();
        } else {
          this.validateAllFormFields(formParts);
          this.showValidationMessage = true;
        }
      }
    }
  }

  createEmployerItem(): FormGroup {
    return this.fb.group({
      employerName: [''],
      employerPhoneNumber: [''],
      employerFirstName: [''],
      employerLastName: [''],
      employerAddress: this.fb.group({
        line1: [''],
        line2: [''],
        city: [''],
        postalCode: [''],  // , [Validators.pattern(postalRegex)]
        province: [{ value: 'British Columbia', disabled: false }],
        country: [{ value: 'Canada', disabled: false }],
      })
    });
  }

  submitPartialApplication() {
    this.justiceDataService.submitApplication(this.harvestForm())
      .subscribe(
        data => {
          console.log("submitting partial form");
          this.router.navigate(['/application-success']);
        },
        err => {
          this.snackBar.open('Error submitting application', 'Fail', { duration: 3500, panelClass: ['red-snackbar'] });
          console.log('Error submitting application');
        }
      );
  }

  submitApplication() {
    // show the button as submitting and disable it
    this.submitting = true;
    if (this.form.valid) {
      this.justiceDataService.submitApplication(this.harvestForm())
        .subscribe(
          data => {
            if (data['isSuccess'] == true) {
              this.router.navigate(['/application-success']);
            }
            else {
              // re-enable the button
              this.submitting = false;
              this.snackBar.open('Error submitting application', 'Fail', { duration: 3500, panelClass: ['red-snackbar'] });
              console.log('Error submitting application');
            }
          },
          error => {
            // re-enable the button
            this.submitting = false;
            this.snackBar.open('Error submitting application', 'Fail', { duration: 3500, panelClass: ['red-snackbar'] });
            console.log('Error submitting application');
          }
        );
    } else {
      // re-enable the button
      this.submitting = false;
      console.log("form not validated");
      this.markAsTouched();
    }
  }

  debugFormData(): void {
    let formData: Application = {
      Introduction: this.form.get('introduction').value,
      PersonalInformation: this.form.get('personalInformation').value,
      VictimInformation: this.form.get('victimInformation').value,
      CrimeInformation: this.form.get('crimeInformation').value,
      MedicalInformation: this.form.get('medicalInformation').value,
      ExpenseInformation: null,//this.form.get('expenseInformation').value,
      EmploymentIncomeInformation: null,
      RepresentativeInformation: this.form.get('representativeInformation').value,
      DeclarationInformation: this.form.get('declarationInformation').value,
      AuthorizationInformation: this.form.get('authorizationInformation').value,
    };
    //console.log(formData);
    console.log(JSON.stringify(formData));
  }

  harvestForm(): Application {
    return {
      Introduction: this.form.get('introduction').value as Introduction,
      PersonalInformation: this.form.get('personalInformation').value as PersonalInformation,
      CrimeInformation: this.form.get('crimeInformation').value as CrimeInformation,
      MedicalInformation: this.form.get('medicalInformation').value as MedicalInformation,
      ExpenseInformation: this.form.get('expenseInformation').value as ExpenseInformation,
      EmploymentIncomeInformation: null as EmploymentIncomeInformation,// this.form.get('employmentIncomeInformation').value as EmploymentIncomeInformation, // No employement information in Witness applications
      RepresentativeInformation: this.form.get('representativeInformation').value as RepresentativeInformation,
      DeclarationInformation: this.form.get('declarationInformation').value as DeclarationInformation,
      AuthorizationInformation: this.form.get('authorizationInformation').value as AuthorizationInformation,
      VictimInformation: this.form.get('victimInformation').value as VictimInformation,
    } as Application;
  }

  save(): void {
    this.justiceDataService.submitApplication(this.harvestForm())
      .subscribe(
        data => { },
        err => { }
      );
  }

  // marking the form as touched makes the validation messages show
  markAsTouched() {
    this.form.markAsTouched();
  }

  private buildApplicationForm(): FormGroup {
    return this.fb.group({
      introduction: this.fb.group({
        understoodInformation: ['', Validators.requiredTrue]
      }),
      personalInformation: this.personalInfoHelper.setupFormGroup(this.fb, this.FORM_TYPE),
      victimInformation: this.victimInfoHelper.setupFormGroup(this.fb, this.FORM_TYPE),
      crimeInformation: this.crimeInfoHelper.setupFormGroup(this.fb, this.FORM_TYPE),
      medicalInformation: this.medicalInfoHelper.setupFormGroup(this.fb, this.FORM_TYPE),
      expenseInformation: this.fb.group({
        haveCounsellingExpenses: [false],
        haveCounsellingTransportation: [false],
        havePrescriptionDrugExpenses: [false],
        minimumBenefitsSelected: ['', Validators.required],

        // Additional Expenses
        haveCrimeSceneCleaningExpenses: [false],
        noneOfTheAboveExpenses: [''],
        minimumAdditionalBenefitsSelected: [''], // Dynamically required

        missedWorkDueToDeathOfVictim: [''], // Dynamically required

        didYouLoseWages: [''], //, Validators.required],
        daysWorkMissedStart: [''], //, Validators.required],
        daysWorkMissedEnd: [''],

        employers: this.fb.array([this.createEmployerItem()]),
        mayContactEmployer: [''],

        additionalBenefitsDetails: [''],//, Validators.required], ??
        // Other Benefits
        haveDisabilityPlanBenefits: [false],
        haveEmploymentInsuranceBenefits: [false],
        haveIncomeAssistanceBenefits: [false],
        haveCanadaPensionPlanBenefits: [false],
        haveAboriginalAffairsAndNorthernDevelopmentCanadaBenefits: [false],
        haveCivilActionBenefits: [false],
        haveOtherBenefits: [false],
        otherSpecificBenefits: [''],
        noneOfTheAboveBenefits: [false],
        minimumOtherBenefitsSelected: [''], // Dynamically required
      }),

      representativeInformation: this.representativeInfoHelper.setupFormGroup(this.fb, this.FORM_TYPE),

      declarationInformation: this.fb.group({
        declaredAndSigned: ['', Validators.requiredTrue],
        signature: ['', Validators.required],
      }),

      authorizationInformation: this.authInfoHelper.setupFormGroup(this.fb, this.FORM_TYPE),
    });
  }
}
