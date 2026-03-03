"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.GoToPageModal = void 0;var _v = require("discord-api-types/v10");
var _Label = require("../../classes/components/Label.js");
var _TextInput = require("../../classes/components/TextInput.js");
var _Modal = require("../../classes/Modal.js");
class GoToPageModal extends _Modal.Modal {
  title = "Go to Page";
  customId;
  components = [new PageNumberLabel()];
  constructor(paginatorId, maxPages) {
    super();
    this.customId = `paginator-goto:id=${paginatorId};max=${maxPages}`;
  }
  async run(interaction, data) {
    const pageInput = interaction.fields.getText("page", true);
    const pageNumber = Number.parseInt(pageInput, 10);
    const paginatorId = data.id;
    const maxPages = data.max;
    // Validate page number
    if (Number.isNaN(pageNumber) || pageNumber < 1 || pageNumber > maxPages) {
      return interaction.reply({
        content: `Please enter a valid page number between 1 and ${maxPages}.`,
        flags: _v.MessageFlags.Ephemeral
      });
    }
    // Find the paginator and navigate to the page
    const paginator = interaction.client.paginators.find((p) => p.id === paginatorId);
    if (!paginator) {
      return interaction.reply({
        content: "Paginator not found in memory.",
        flags: _v.MessageFlags.Ephemeral
      });
    }
    // Check if user is authorized to use this paginator
    if (paginator.userId && paginator.userId !== interaction.user?.id) {
      return interaction.acknowledge();
    }
    // Convert to 0-based index and navigate
    await paginator.goToPageFromModal(pageNumber - 1, interaction);
  }
}exports.GoToPageModal = GoToPageModal;
class PageNumberLabel extends _Label.Label {
  label = "Page Number";
  description = "Enter the page number you want to go to";
  constructor() {
    super(new PageNumberInput());
  }
}
class PageNumberInput extends _TextInput.TextInput {
  customId = "page";
  style = _v.TextInputStyle.Short;
  placeholder = "Enter page number...";
  minLength = 1;
  maxLength = 10;
  required = true;
} /* v9-130e0395f9efb74d */
