
import {bindable, inject} from 'aurelia-framework';
import {Router} from 'aurelia-router';
import {domEventDispatch} from 'dom-event-dispatch';

import {IIdentity} from '@essential-projects/iam_contracts';
import {DataModels} from '@process-engine/management_api_contracts';

import {
  IDynamicUiService,
  ISolutionEntry,
} from '../../contracts';

enum ButtonClickActions {
  cancel = 'cancel',
  process = 'proceed',
  decline = 'decline',
}

@inject('DynamicUiService', Router, Element)
export class DynamicUiWrapper {

  public onButtonClick: (action: ButtonClickActions) => void;
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

  public async handleUserTaskButtonClick(action: ButtonClickActions, userTask: any): Promise<void> {
    const actionCanceled: boolean = action === ButtonClickActions.cancel;

    if (actionCanceled) {
      this._cancelTask();

      return;
    }

    this._finishUserTask(action, userTask);
  }

  public async handleManualTaskButtonClick(action: ButtonClickActions): Promise<void> {
    const actionCanceled: boolean = action === ButtonClickActions.cancel;

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

  private _finishUserTask(action: ButtonClickActions, userTask: any): Promise<void> {
    const noUserTaskKnown: boolean = !this.isHandlingUserTask;

    if (noUserTaskKnown) {
      return;
    }

    const {correlationId, processInstanceId, userTaskInstanceId, results} = userTask;

    this._dynamicUiService.finishUserTask(this._identity,
                                          processInstanceId,
                                          correlationId,
                                          userTaskInstanceId,
                                          results);

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
      this.onButtonClick(ButtonClickActions.process);
    }
  }
}
