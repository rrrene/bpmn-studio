
import {bindable, inject} from 'aurelia-framework';
import {Router} from 'aurelia-router';
import {domEventDispatch} from 'dom-event-dispatch';

import {IIdentity} from '@essential-projects/iam_contracts';
import {DataModels} from '@process-engine/management_api_contracts';

import {
  IBooleanFormField,
  IDynamicUiService,
  IEnumFormField,
  ISolutionEntry,
  IStringFormField,
} from '../../contracts';

@inject('DynamicUiService', Router, Element)
export class DynamicUiWrapper {

  public onButtonClick: (action: 'cancel' | 'proceed' | 'decline') => void;
  @bindable() public currentUserTask: DataModels.UserTasks.UserTask;
  @bindable() public currentManualTask: DataModels.ManualTasks.ManualTask;

  @bindable() public isModal: boolean;

  private _element: Element;
  private _router: Router;
  private _dynamicUiService: IDynamicUiService;
  private _identity: IIdentity;
  private _activeSolutionEntry: ISolutionEntry;

  constructor(dynamicUiService: IDynamicUiService,
              router: Router,
              element: Element) {

    this._dynamicUiService = dynamicUiService;
    this._router = router;
    this._element = element;

    this.isModal = false;
  }

  public set identity(identity: IIdentity) {
    this._identity = identity;
  }

  public set activeSolutionEntry(solutionEntry: ISolutionEntry) {
    this._activeSolutionEntry = solutionEntry;
  }

  public async handleUserTaskButtonClick(action: 'cancel' | 'proceed', userTask: any): Promise<void> {
    const actionCanceled: boolean = action === 'cancel';

    if (actionCanceled) {
      this._cancelTask();

      return;
    }

    this._finishUserTask(action, userTask);
  }

  public async handleManualTaskButtonClick(action: 'cancel' | 'proceed'): Promise<void> {
    const actionCanceled: boolean = action === 'cancel';

    if (actionCanceled) {
      this._cancelTask();

      return;
    }

    this._finishManualTask();
  }

  public get isHandlingManualTask(): boolean {
    return this.currentManualTask !== undefined;
  }

  public get isHandlingUserTask(): boolean {
    return this.currentUserTask !== undefined;
  }

  private _cancelTask(): void {
    if (this.isModal) {
      domEventDispatch.dispatchEvent(this._element, 'close-modal', {bubbles: true});

      return;
    }

    const correlationId: string = this.currentUserTask ? this.currentUserTask.correlationId : this.currentManualTask.correlationId;

    this._router.navigateToRoute('task-list-correlation', {
      correlationId: correlationId,
      solutionUri: this._activeSolutionEntry.uri,
    });
  }

  private _finishUserTask(action: 'cancel' | 'proceed' | 'decline', userTask: any): Promise<void> {
    const noUserTaskKnown: boolean = !this.isHandlingUserTask;

    if (noUserTaskKnown) {
      return;
    }

    const correlationId: string = userTask.correlationId;
    const processInstanceId: string = userTask.processInstanceId;
    const userTaskInstanceId: string = userTask.userTaskInstanceId;
    const userTaskResult: DataModels.UserTasks.UserTaskResult = userTask.results;

    this._dynamicUiService.finishUserTask(this._identity,
      processInstanceId,
      correlationId,
      userTaskInstanceId,
      userTaskResult);

    this.currentUserTask = undefined;

    const buttonClickHandlerExists: boolean = this.onButtonClick !== undefined;
    if (buttonClickHandlerExists) {
      this.onButtonClick(action);
    }
  }

  private _finishManualTask(): Promise<void> {
    const noManualTaskKnown: boolean = !this.isHandlingManualTask;

    if (noManualTaskKnown) {
      return;
    }

    const correlationId: string = this.currentManualTask.correlationId;
    const processInstanceId: string = this.currentManualTask.processInstanceId;
    const manualTaskInstanceId: string = this.currentManualTask.flowNodeInstanceId;

    this._dynamicUiService.finishManualTask(this._identity,
      processInstanceId,
      correlationId,
      manualTaskInstanceId);

    this.currentManualTask = undefined;

    const buttonClickHandlerExists: boolean = this.onButtonClick !== undefined;
    if (buttonClickHandlerExists) {
      this.onButtonClick('proceed');
    }
  }
}
