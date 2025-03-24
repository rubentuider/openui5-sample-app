/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import type Component from "../../Component";
import BaseDialog from "../BaseDialog";

import Fragment from "sap/ui/core/Fragment";
import UI5Element from "sap/ui/core/Element";
import { ValueState } from "sap/ui/core/library";
import type { Control$ValidateFieldGroupEvent } from "sap/ui/core/Control";
import type Control from "sap/ui/core/Control";

import Message from "sap/ui/core/message/Message";
import MessageType from "sap/ui/core/message/MessageType";
import type { MessagePopover$ItemSelectEvent } from "sap/m/MessagePopover";
import type MessagePopover from "sap/m/MessagePopover";

import type ResourceModel from "sap/ui/model/resource/ResourceModel";
import type ResourceBundle from "sap/base/i18n/ResourceBundle";
import type Context from "sap/ui/model/odata/v4/Context";
import type ODataModel from "sap/ui/model/odata/v4/ODataModel";
import JSONModel from "sap/ui/model/json/JSONModel";

import SimpleForm from "sap/ui/layout/form/SimpleForm";

import type Button from "sap/m/Button";
import type { Button$PressEvent } from "sap/m/Button";
import type Dialog from "sap/m/Dialog";
import Input from "sap/m/Input";
import type MessageItem from "sap/m/MessageItem";
import Select from "sap/m/Select";
import Switch from "sap/m/Switch";
import { InputType } from "sap/m/library";
import Label from "sap/m/Label";
import type { RadioButtonGroup$SelectEvent } from "sap/m/RadioButtonGroup";
import RadioButtonGroup from "sap/m/RadioButtonGroup";
import RadioButton from "sap/m/RadioButton";
import Item from "sap/ui/core/Item";
import MessageBox from "sap/m/MessageBox";
import ElementRegistry from "sap/ui/core/ElementRegistry";
import type ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";
import type { ODataListBinding$CreateCompletedEvent } from "sap/ui/model/odata/v4/ODataListBinding";
import UploadSetwithTable from "sap/m/plugins/UploadSetwithTable";
import type { UploadCollection$UploadCompleteEvent } from "sap/m/UploadCollection";
import Table from "sap/m/Table";
import uid from "sap/base/util/uid";
import type UploadItem from "sap/m/upload/UploadItem";
import type ColumnListItem from "sap/m/ColumnListItem";

/**
 * @namespace schwarzit.mmmake.jobsearch.frontend.view.ApplyDialog
 */
export default class ApplyDialog extends BaseDialog {
  private static _instance: ApplyDialog;
  private _dialog: Dialog | undefined;
  private _messagePopover: MessagePopover;
  private _binding: ODataListBinding | undefined;

  /**
   * This enables the Singleton pattern
   */
  private constructor() {
    super();
  }
  public static getInstance(): ApplyDialog {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return this._instance || (this._instance = new this());
  }

  /**
   * @see ResourceBundle.getText
   */
  private _getText(key: string, args?: unknown[], ignoreKeyFallback?: boolean): string {
    const rm = this._dialog?.getModel("i18n") as ResourceModel;
    const rb = rm.getResourceBundle() as ResourceBundle;

    return rb.getText(key, args, ignoreKeyFallback) as string;
  }

  public async prepare(component: Component, jobReqId: number, listBinding?: ODataListBinding): Promise<void> {
    if (!this._dialog) {
      this._dialog = await Fragment.load({
        name: "com.myorg.myapp.view.ApplyDialog.ApplyDialog",
        type: "XML",
        controller: this
      }) as Dialog;

      this._dialog.addStyleClass(component.getContentDensityClass());

      const rm = component.getModel("i18n") as ResourceModel;
      this._dialog.setModel(rm, "i18n");

      const jobsearchModel = component.getModel("jobsearch") as ODataModel;
      this._dialog.setModel(jobsearchModel, "jobsearch");
      const picklistModel = component.getModel("picklist") as ODataModel;
      this._dialog.setModel(picklistModel, "picklist");
      const applicationsModel = component.getModel("application") as ODataModel;
      this._dialog.setModel(applicationsModel, "application");

      const appDataModel = component.getModel("appData") as JSONModel;
      this._dialog.setModel(appDataModel, "appData");
      const documents = component.getModel("documents") as JSONModel;
      this._dialog.setModel(documents, "documents");

      const messages = new JSONModel({
        errors: []
      });
      this._dialog.setModel(messages, "messages");

      const dataModel = new JSONModel();
      this._dialog.setModel(dataModel, "data");
    }

    this._dialog.bindElement({
      path: `/JobRequisitionSet(${jobReqId})`,
      parameters: {
        $expand: "questions($expand=choices)"
      },
      model: "jobsearch"
    });

    if (listBinding) {
      this._binding = listBinding;
    } else {
      const applicationsModel = component.getModel("application") as ODataModel;
      this._binding = applicationsModel?.bindList("/ApplicationSet");
    }
  }

  /**
   * Open the dialog
   *
   * @returns a Promise to handle success/error of the dialog
   */
  public async open(): Promise<unknown> {
    if (this._dialog) {
      // always ensure to delete all previous messages (like duplicate application
      // for a job requisition)
      const applications = this._dialog.getModel("application") as ODataModel;
      applications?.setMessages();

      this._initData();
      const data = this._dialog.getModel("data") as JSONModel;
      const appData = this._dialog.getModel("appData") as JSONModel;
      data.setProperty("/yourData/rcm_country", appData?.getProperty("/rcm_country"));

      this._dialog.setInitialFocus("salutation");

      return this.openDialog(this._dialog);
    }
  }

  /**
   * This function initializes the dialog's data
   *
   * @private
   */
  private _initData(): void {
    const dataModel = this._dialog?.getModel("data") as JSONModel;
    dataModel.setData({
      yourData: {
        rcm_country: "",
        rcm_privacysettings: 0,
        salutation: 289950,
        custPoolApproval: false
      },
      questions: {}
    })
  }

  /**
   * This is the event handler for the view's save button.
   *
   * @private
   */
  private _onSave(): void {
    // Trigger validation
    const form = ElementRegistry.get("applyDialogForm") as SimpleForm;
    form.triggerValidateFieldGroup(["yourRequiredData", "attachments"]);

    if (!this._formHasErrors()) {
      const context = this._dialog?.getBindingContext("jobsearch")

      const dataModel = form.getModel("data") as JSONModel;
      const applicationData = dataModel.getProperty("/yourData");

      // get the country's text (in a weird way :/)
      // 10.09.2024: For SF we need the EN country name.
      // Transfer picklist option ID to CAP, let the backend read the name.
      const select = ElementRegistry.get("country") as Select;
      const item = select.getSelectedItem() ?? undefined;
      applicationData.country = item?.getKey();

      // transform the responses from the model into an array, so it can be
      // used for a request
      const responses: object[] = [];
      const questions = dataModel.getProperty("/questions") as object;
      const keys = Object.keys(questions);
      keys.forEach(key => {
        responses.push({
          "question": key,
          // @ts-expect-error we know
          "order": questions[key].order,
          // @ts-expect-error we know
          "answer": questions[key].response
        })
      });

      this._dialog?.setBusy(true);
      this._createApplication({
        candidate: applicationData,
        responses,
        jobRequisition: context
      }).then(() => {
        this._dialog?.close();
        super.closeSuccess();

        this._tidyUp();
      }).catch((error: unknown) => {
        // do nothing
        if (error instanceof Error) {
          MessageBox.error(error.message);
        } else {
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          MessageBox.error(`${error}`);
        }
      }).finally(() => {
        this._dialog?.setBusy(false);
      });
    }
  }

  /**
   * This function uses 'this._binding' to call an OData create-request and uses
   * all given information to create an '/ApplicationSet' entity.
   *
   * @param {object} applicationData - contains all necessary information for an
   *    application
   *
   * @returns {Promise<string>} is resolved with an empty string when an
   *    application was sent successfully.
   *    It is rejected with a correspodning error message
   * @private
   */
  private _createApplication(applicationData: object): Promise<string> {
    return new Promise((resolve, reject) => {
      this._binding?.attachEventOnce("createCompleted", (evt: ODataListBinding$CreateCompletedEvent) => {
        const success = evt.getParameter("success");

        if (success) {
          resolve("")
        } else {
          const defModel = this._binding?.getModel() as ODataModel;
          const messages = defModel.getMessagesByPath("", false);

          messages.forEach(message => {
            if (message.getCode() === "409") {
              reject(message.getMessage())
            }
          });
        }
      });

      const documentsModel = this._dialog?.getModel("documents") as JSONModel;
      const items = documentsModel.getProperty("/items");
      const attachments = items.map((item: Record<string, string>) => {
        return {
          "name": item.name,
          "file64": item.file64,
          "category": item.category
        };
      });

      // @ts-expect-error TODO: Import types
      const candidate = applicationData.candidate;

      // transform boolean into string with boolean value
      const agreeToPrivacyStatement = candidate.agreeToPrivacyStatement ? "true" : "false";
      // transform true/false of 'custPoolApproval' into int
      const custPoolApproval = candidate.custPoolApproval ? 1 : 0;

      this._binding?.create({
        // key
        // @ts-expect-error TODO: Import types
        "jobReqId": applicationData.jobRequisition?.getProperty("jobReqId"),

        // data
        "agreeToPrivacyStatement": agreeToPrivacyStatement,
        "cellPhone": candidate.mobile,
        "country": candidate.country,
        "contactEmail": candidate.email,
        "custSalutation_picklistOption_id": candidate.salutation,
        "custPoolApproval_picklistOption_id": custPoolApproval,
        "firstName": candidate.firstName,
        "lastName": candidate.lastName,
        // @ts-expect-error TODO: Import types
        "responses": applicationData.responses,
        "shareProfile_picklistOption_id": candidate.rcm_privacysettings,
        // @ts-expect-error TODO: Import types
        "jobPostingId": applicationData.jobRequisition?.getProperty("extJobPostingId"),
        "attachments": attachments
      }, /*skip refresh*/ true);
    })
  }

  /**
   * This is the event handler for the view's close button
   *
   * @private
   */
  private _onClose(): void {
    // Tidy up the dialog before closing
    this._tidyUp();

    this._dialog?.close();
    super.closeAbort(false);
  }

  /**
   * This function clears all binding etc.
   */
  private _tidyUp(): void {
    const messageModel = this._dialog?.getModel("messages") as JSONModel;
    messageModel.setProperty("/errors", []);

    const documentsModel = this._dialog?.getModel("documents") as JSONModel;
    documentsModel.setProperty("/items", []);

    this._initData();

    this._dialog?.unbindElement("jobsearch");
  }

  /**
   * This function is triggered when a fieldgroup validation should take place.
   * This happens when the user clicks on 'save'
   * @param {Control$ValidateFieldGroupEvent} evt - fired by the corresponding
   *    control
   * @private
   */
  private _validate(evt: Control$ValidateFieldGroupEvent): void {
    const eventSource = evt.getSource();

    const messageModel = this._dialog?.getModel("messages") as JSONModel;
    let messages = messageModel.getProperty("/errors") as Message[];

    let value, messageKey = "";

    // If the form was triggered to validate, iterate through all possible
    // inputs
    if (eventSource instanceof SimpleForm) {
      // only validate inputs when form should be validated. Because when
      // clicking a MessageItem, the fieldgroupValidation will be triggered as
      // well, and thus the model will be empty, and thus the error-button will
      // disapper in the dialog's footer
      const fieldGroupIds = evt.getParameter("fieldGroupIds") ?? [];

      messages.length = 0;

      // fetching controls from the dialog to fetch all questions (plus the
      // optional additional questions)
      fieldGroupIds.forEach(fieldGroupId => {
        const controls = this._dialog?.getControlsByFieldGroupId(fieldGroupId) ?? [];
        controls.forEach(control => {
          const controlFieldGroups = control.getFieldGroupIds().join(",");

          if (controlFieldGroups.includes("yourRequiredData")) {
            value = "";
            messageKey = "";

            if (control instanceof Input) {
              value = this._validateInput(control);
              messageKey = "applyDialog.validateError.Input";
            } else if (control instanceof Select) {
              value = this._validateSelect(control);
              messageKey = "applyDialog.validateError.Select";
            } else if (control instanceof Switch) {
              value = this._validateSwitch(control);
              messageKey = "applyDialog.validateError.Switch";
            } else if (control instanceof RadioButtonGroup) {
              value = this._validateRadioButtonGroup(control);
              messageKey = "applyDialog.validateError.RadioButtonGroup";
            } else {
              throw new Error(`Unknown type of control ${control.getMetadata().getName()}`);
            }

            if (!value) {
              const text = this._getText(messageKey) as string;
              messages = this._addMessage(control, messages, text);
            }
          } else if (controlFieldGroups.includes("attachments")) {
            const items = (control as Table).getItems() as ColumnListItem[];

            if (items.length > 0) {
              items.forEach(item => {
                debugger;
                const context = item.getBindingContext("documents");

                if (!context?.getProperty("category")) {
                  const select = item.getCells().find(cell => cell instanceof Select);
                  const text = this._getText("applyDialog.validateError.Attachments.ItemCategory") as string;
                  messages = this._addMessage(select as Control, messages, text);
                }
              });
            } else {
              // Currently not mandatory, so no explicit validation
              // const text = this._getText("applyDialog.validateError.Attachments") as string;
              // messages = this._addMessage(control, messages, text);
            }
          }
        })
      });
    } else {
      if (eventSource instanceof Input) {
        // TODO: DRY here
        value = this._validateInput(eventSource);
        messageKey = "applyDialog.validateError.Input";
      } else if (eventSource instanceof Select) {
        value = this._validateSelect(eventSource);
        messageKey = "applyDialog.validateError.Select";
      } else if (eventSource instanceof Switch) {
        value = this._validateSwitch(eventSource);
        messageKey = "applyDialog.validateError.Switch";
      } else if (eventSource instanceof RadioButtonGroup) {
        value = this._validateRadioButtonGroup(eventSource);
        messageKey = "applyDialog.validateError.RadioButtonGroup";
      } else if (eventSource instanceof Table) {
        // Currently not mandatory, so no explicit validation
        value = true;
        // value = eventSource.getItems().length;
        // messageKey = "applyDialog.validateError.Attachments";
      }

      if (!value) {
        const text = this._getText(messageKey) as string;
        messages = this._addMessage(eventSource, messages, text);
      } else {
        messages = this._removeMessage(eventSource, messages);
      }
    }

    messageModel.setProperty("/errors", messages);
    messageModel.updateBindings(/*force*/ true);
  }
  /**
   * Validates an Input's value
   *
   * @param {sap.m.Input} control - the Input that should be validated
   * @returns {string} empty if invalid, otherwise with the input's value
   *
   * @private
   */
  private _validateInput(control: Input): string {
    let value = control.getValue() as string;
    const type = control.getType();

    if (type === InputType.Email) {
      const r = new RegExp(/^.+@.+\.[a-zA-Z]{2,}$/ig);
      value = r.test(value) ? value : "";
    } else if (type === InputType.Tel) {
      // Don't start with '0' or '+' -> start with a digit and afterwards some digits
      const r = new RegExp(/^[1-9]\d*$/);
      value = r.test(value) ? value : "";
    }

    return value;
  }
  /**
   * Validates a Select's value
   *
   * @param {sap.m.Select} control - the Select that should be validated
   * @returns {string} empty if invalid, otherwise with the Select's value
   *
   * @private
   */
  private _validateSelect(control: Select): string {
    let key = control.getSelectedKey() as string;

    if (key === "-1" || parseInt(key, 10) < 0) {
      key = ""
    }

    return key;
  }
  /**
   * Validates a Switch's value
   *
   * @param {sap.m.Switch} control - the Switch that should be validated
   * @returns {boolean} false if invalid, otherwise true
   *
   * @private
   */
  private _validateSwitch(control: Switch): boolean {
    return control.getState() as boolean;
  }
/**
   * Validates a RadioButtonGroup
   *
   * @param {sap.m.RadioButtonGroup} control - the RadioButtonGroup that should be validated
   * @returns {string} false if invalid, otherwise true
   *
   * @private
   */
  private _validateRadioButtonGroup(control: RadioButtonGroup): boolean {
    return (control.getSelectedIndex() >= 0) as boolean;
  }

  /**
   * This adds a message to the given messages-array - only if there is no
   * message for the given control yet (preventing duplicates)
   *
   * @param {sap.ui.core.Control} control - necessary to get some detail
   *    information for the message
   * @param {Array<Message>} messages - the instance to the messages of the
   *    message model
   * @param {string} text - the message's text
   *
   * @returns {Array<Message>} the messages
   * @private
   */
  private _addMessage(control: Control, messages: Message[], text: string): Message[] {
    // @ts-expect-error: we know 'id' will exist because we create it with it
    if (!messages.find(errorMessage => errorMessage.getTechnicalDetails().id === control.getId())) {
      // if 'messages' doesn't contain a message with the control's id
      const fieldName = control.data("fieldName");
      const newMessage = new Message({
          message: text,
          additionalText: fieldName,
          type: MessageType.Error,
          technicalDetails: {
            id: control.getId(),
            name: fieldName
          }
      });

      messages.push(newMessage);
    }

    return messages;
  }

  /**
   * This creates a Message with the given information
   *
   * @param {string} text - the message's text
   * @param {sap.ui.core.Control} control - necessary to get some detail
   *    information for the message
   * @returns {Message} the message
   *
   * @private
   */
  private _createMessage(text: string, control: Control): Message {
    const fieldName = control.data("fieldName");

    return new Message({
        message: text,
        additionalText: fieldName,
        type: MessageType.Error,
        technicalDetails: {
          id: control.getId(),
          name: fieldName
        }
    });
  }
  /**
   * This function removes messages that correlates with the given control
   *
   * @param {sap.ui.core.Control} control - to get the id from and find the
   *    correct message
   * @param {Array<Message>} messages - from which an error from the given
   *    control should be removed
   * @returns {Array<Message>} an array without the removed message
   *
   * @private
   */
  private _removeMessage(control: Control, messages: Message[]): Message[] {
    const id = control.getId();

    return messages.filter((message: Message) => {
      const details = message.getTechnicalDetails();
      // @ts-expect-error it's there
      return details.id !== id
    });
  }

  /**
   * This function checks whether the 'messages' model contains validation
   * errors
   *
   * @returns {boolean} whether there are validation errors
   * @private
   */
  private _formHasErrors(): boolean {
    const messageModel = this._dialog?.getModel("messages") as JSONModel;
    return messageModel.getProperty("/errors").length > 0;
  }
  /**
   * Formatter to determine the amount of errors
   *
   * @param {Array<Message>} errors - contains validation errors
   * @returns {int} the amount of errors
   * @private
   */
  private _errorsCountFormatter(errors: Message[]): int {
    return errors.length;
  }
  /**
   * Formatter to get a GroupingHeader for the MessagePopover
   *
   * @returns {string} with the corresponding GroupingHeader for the
   *    MessageItems
   * @private
   */
  private _getMessageItemGroupName(): string {
    return this._getText("applyDialog.form.yourData") as string;
  }

  /**
   * This formats the ValueState for a corresponding input field
   *
   * @param {string} fieldName - the given label
   * @param {Array<Message>} errors - the current errors
   * @returns {ValueState} None or Error
   *
   * @private
   */
  private _valueStateFormatter(fieldName: string, errors: Message[]): ValueState {
    let state = ValueState.None;

    errors.forEach(error => {
      const details = error.getTechnicalDetails();
      // @ts-expect-error property is set when creating a message
      if (details.name === fieldName) {
        state = ValueState.Error;
      }
    });

    return state;
  }
  /**
   * This event handler is called when a MessageItem was pressed.
   * It triggers focusing the corresponding control in the dialog and closes
   * the MessagePopover.
   *
   * @param {MessagePopover$ItemSelectEvent} evt - fired by the MessageItem
   * @private
   */
  private _onTitlePress(evt: MessagePopover$ItemSelectEvent): void {
    const popover = evt.getSource();
    const item = evt.getParameter("item") as MessageItem;
    const message = item.data("message") as Message;
    const details = message.getTechnicalDetails()
    // @ts-expect-error it's there
    const id = details.id;

    setTimeout(() => {
      const control = UI5Element.getElementById(id) ?? undefined;
      control?.focus();
    }, 300);

    popover.close();
  }

  /**
   * This event listener triggers opening the MessagePopover
   *
   * @param {Button$PressEvent} evt - fired by the button
   * @private
   */
  private async _onOpenMessagePopup(evt: Button$PressEvent): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!this._messagePopover) {
      this._messagePopover = await Fragment.load({
        name: "schwarzit.mmmake.jobsearch.frontend.view.ApplyDialog.MessagePopover",
        type: "XML",
        controller: this
      }) as MessagePopover;

      const messages = this._dialog?.getModel("messages");
      this._messagePopover.setModel(messages, "messages");
    }

    this._messagePopover.openBy(evt.getSource());
  }

  /**
   * This factory creates the form for the additional questions
   *
   * @param {string} id - control id which calls this factory
   * @param {sap.ui.model.odata.v4.Context} context - the binding context
   * @returns {SimpleForm} the form with the corresponding label - control pairs
   *
   * @private
   */
  private _controlFactory(id: string, context: Context): SimpleForm {
    const question = context.getObject();

    let required: boolean;
    if (typeof (question.required) === "boolean") {
      required = question.required;
    } else if (typeof (question.required) === "string") {
      required = question.required === "1" ? true : false;
    } else {
      throw new Error(`Unknown type of 'question.required': ${question.required}`);
    }

    const dataModel = this._dialog?.getModel("data") as JSONModel;

    let path = `/questions/${question.questionId}`;
    dataModel.setProperty(path, {});
    dataModel.setProperty(`${path}/order`, question.order);
    path += "/response"
    dataModel.setProperty(path, null);

    const label = new Label({
      text: question.questionName,
      required
    }) as Label;
    if (required) {
      label.addStyleClass("mmmakeUiRocketApplyFormRequired")
    }

    const form = new SimpleForm({
      content: [ label ],
      editable: true
    }).addStyleClass("mmmakeUiRocketApplyFormExtraQuestions");

    let control: Input | Select | RadioButtonGroup | undefined = undefined;
    let choices = [];
    let choicesLength = 0;

    // const formatter = this._valueStateFormatter.bind(this)

    switch (question.questionType) {
      case "QUESTION_NUMERIC":
        control = new Input({
          value: {
            path: path,
            model: "data"
          },
          type: InputType.Number
        });
        break;

      case "QUESTION_TEXT":
        control = new Input({
          value: {
            path: path,
            model: "data"
          }
        });
        break;

      case "QUESTION_MULTI_CHOICE":
      case "QUESTION_RATING":
        choices = question.choices ? question.choices as unknown[] : [];
        choicesLength = choices.length;

        if (choicesLength === 2 && question.questionType === "QUESTION_MULTI_CHOICE") {
          control = new RadioButtonGroup({
            buttons: [
              new RadioButton({
                text: question.choices[0].optionLabel
              }),
              new RadioButton({
                text: question.choices[1].optionLabel
              }),
            ],
            selectedIndex: -1,
            select: (ev: RadioButtonGroup$SelectEvent): void => {
              const index = ev.getParameter("selectedIndex") ?? -1;
              const rbg = ev.getSource();
              const optionLabel = rbg.data("question").choices[index].optionLabel;

              dataModel.setProperty(path, optionLabel)
            }
          });

          dataModel.setProperty(path, question.choices[0].optionLabel);
        } else {
          const select = new Select({
            selectedKey: {
              path: path,
              model: "data"
            }
          });

          // @ts-expect-error TODO import types
          const sortedChoices = choices.sort(choice => choice.questionOrder as object);
          sortedChoices.forEach((choice, index) => {
            select.addItem(new Item({
              // @ts-expect-error TODO import types
              key: choice.optionLabel,
              // @ts-expect-error TODO import types
              text: choice.optionLabel
            }));

            if (index === 0) {
              // @ts-expect-error TODO import types
              dataModel.setProperty(path, choice.optionLabel);
            }
          });

          control = select;
        }

        break;

      default:
        MessageBox.error(`Question type not implemented: '${question.questionType}'`);

    }

    if (control) {
      if (required) {
        control.setFieldGroupIds(["yourRequiredData"])
      }
      control.data("question", question);
      control.data("fieldGroup", this._getText("applyDialog.form.screeningQuestions"));
      control.data("fieldName", question.questionName);

      form.addContent(control);
    }
    return form;
  }

  /**
   * Event handler to process the uploaded file
   *
   * @param {UploadCollection$UploadCompleteEvent} evt - fired by the
   *    UploadCollection
   *
   * @public
   */
  public async _onUploadCompleted(evt: UploadCollection$UploadCompleteEvent): Promise<void> {
    // @ts-expect-error yes 'item' exists
    const item = evt.getParameter("item") as unknown as UploadItem;
    const uploadStatus = evt.getParameter("status") as unknown as number;

    if (uploadStatus >= 400) {
      const response = evt.getParameter("response") ?? "";
      MessageBox.error(response);
    } else if (uploadStatus >= 200 && uploadStatus < 300) {
      const content = await this._toBase64(item);
      const documentsModel = item.getModel("documents") as JSONModel;
      const items = documentsModel.getProperty("/items");
      items.push({
        "id": uid(),
        "capplicationId": "",
        "name": item.getFileName(),
        "fileSize": item.getFileSize(),
        "file64": content
      })
      documentsModel.refresh(true);
    }

    const table = ElementRegistry.get("applyDialogUploadTable") as Table;
    table.triggerValidateFieldGroup(["attachments"]);
  }

  /**
   * This is the converter to get a file's base64 content
   *
   * @param {UploadItem} item - the uploaded file to convert
   *
   * @returns a Promise that resolves with the base64 string
   * @private
   */
  private _toBase64(item: UploadItem): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(item.getFileObject());
      reader.onload = (): void => resolve(reader.result as string);
      reader.onerror = (error): void => reject(error);
    });
  }

  /**
   * Event handler for removing a file for the application
   *
   * @param {Button$PressEvent} evt - fired by the button
   * @private
   */
  public _onRemoveHandler(evt: Button$PressEvent): void {
    const button = evt.getSource() as Button;
    const context = button.getBindingContext("documents") as Context;

    this._removeItem(context);
  }
  /**
   * This removes the file from the model, according to the given context
   *
   * @param {Context} context - the binding context to be removed
   * @private
   */
  private _removeItem(context: Context | undefined): void {
    if (context) {
      const dataModel = context.getModel() as JSONModel;
      const table = ElementRegistry.get("applyDialogUploadTable") as Table;

      const message = this._getText("applyDialog.upload.removeFileQuestion", [context.getProperty("name")]);

      MessageBox.warning(message, {
        actions: [
          MessageBox.Action.OK,
          MessageBox.Action.CANCEL
        ],
        emphasizedAction: MessageBox.Action.OK,
        styleClass: this._component?.getContentDensityClass(),
        initialFocus: MessageBox.Action.CANCEL,
        onClose: function(action: string) {
          if (action !== MessageBox.Action.OK) {
            return;
          }

          const path = context.getPath();
          if (path.split("/")[2]) {
            const index = path.split("/")[2];
            const data = dataModel.getProperty("/items");
            data.splice(index, 1);
            dataModel.refresh(true);

            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (table.removeSelections) {
              table.removeSelections();
            }
          }
        }
      });

      table.triggerValidateFieldGroup(["attachments"]);
    }
  }
  /**
   * Formatter for the filesize in the table
   *
   * @param {number} fileSize - the filesize
   *
   * @returns {string} formatted filesize with human readable unit
   * @private
   */
  public _getFileSizeWithUnits(fileSize: number): string {
    return UploadSetwithTable.getFileSizeWithUnits(fileSize) as string;
  }

  /**
   * Event handler when the uploaded file size exceeds the set limit
   *
   * @public
   */
  public _onFileSizeExceeded(): void {
    MessageBox.error(this._getText("applyDialog.upload.error.tooBig") as string);
  }

  /**
   * Event handler is called when the wrong file type is provided. Can happen
   * for example when uploading a file via drag & drop
   *
   * @public
   */
  public _onFileTypeMismatch(): void {
    MessageBox.error(this._getText("applyDialog.upload.error.wrongFileType") as string);
  }
}
