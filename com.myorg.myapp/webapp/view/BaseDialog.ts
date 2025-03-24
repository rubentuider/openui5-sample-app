import type Dialog from "sap/m/Dialog";
import ManagedObject from "sap/ui/base/ManagedObject";

/**
 * @author mmmake GmbH
 * @version ${version}
 *
 * @namespace schwarzit.mmmake.jobsearch.frontend.view
 * @name schwarzit.mmmake.jobsearch.frontend.view.OpenPromise
 */
export class OpenPromise {
  public promise: Promise<unknown>;
  public resolve: (value?: unknown) => void;
  public reject: (value?: unknown) => void;

  public constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
}

/**
 * @extends ManagedObject
 *
 * @author mmmake GmbH
 * @version ${version}
 *
 * @namespace schwarzit.mmmake.jobsearch.frontend.view
 * @name schwarzit.mmmake.jobsearch.frontend.view.BaseDialog
 */
export default class BaseDialog extends ManagedObject {
  protected _promise: OpenPromise | undefined;

  /**
   * This opens the Assign Dialog
   *
   * @param {sap.ui.core.UIComponent} component - is necessary to determine
   *    the contentDensityClass to be set at the dialog
   * @public
   * @static
   */
  protected openDialog(dialog: Dialog): Promise<unknown> {
    this._promise?.reject();
    this._promise = new OpenPromise();
    dialog.open();

    return this._promise.promise;
  }

  protected closeSuccess(value?: never): void {
    this._promise?.resolve(value);
  }
  protected closeAbort(value?: unknown): void {
    this._promise?.reject(value);
  }

}
