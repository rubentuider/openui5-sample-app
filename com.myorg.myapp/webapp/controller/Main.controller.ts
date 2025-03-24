import MessageBox from "sap/m/MessageBox";
import BaseController from "./BaseController";
import ApplyDialog from "../view/ApplyDialog/ApplyDialog";

/**
 * @namespace com.myorg.myapp.controller
 */
export default class Main extends BaseController {
	public sayHello(): void {
		MessageBox.show("Hello World!");
	}

	/**
   * Event handler for the apply button to open the ApplyDialog.
   * When the AssignDialog is closed successfully, sending the application is
   * triggered.
   *
   * @private
   */
  private _onApplyPress(): void {
    const dialog = ApplyDialog.getInstance();
    const component = this.getOwnerComponent();

    const jobRequisition = 283746;

    dialog.prepare(component, jobRequisition).then(
      () => dialog.open()
    ).then(() => {
      // const rb = this.getResourceBundle() as ResourceBundle;
    }).catch(e => {
      if (e instanceof Error) {
        console.error(e);
      }
    });
  }
}
