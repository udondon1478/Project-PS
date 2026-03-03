"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.ComponentHandler = void 0;var _v = require("discord-api-types/v10");
var _Base = require("../abstracts/Base.js");
var _Button = require("../classes/components/Button.js");
var _ChannelSelectMenu = require("../classes/components/ChannelSelectMenu.js");
var _MentionableSelectMenu = require("../classes/components/MentionableSelectMenu.js");
var _RoleSelectMenu = require("../classes/components/RoleSelectMenu.js");
var _StringSelectMenu = require("../classes/components/StringSelectMenu.js");
var _UserSelectMenu = require("../classes/components/UserSelectMenu.js");
var _LRUCache = require("../utils/LRUCache.js");
var _ButtonInteraction = require("./ButtonInteraction.js");
var _ChannelSelectMenuInteraction = require("./ChannelSelectMenuInteraction.js");
var _MentionableSelectMenuInteraction = require("./MentionableSelectMenuInteraction.js");
var _RoleSelectMenuInteraction = require("./RoleSelectMenuInteraction.js");
var _StringSelectMenuInteraction = require("./StringSelectMenuInteraction.js");
var _UserSelectMenuInteraction = require("./UserSelectMenuInteraction.js");
class ComponentHandler extends _Base.Base {
  componentCache = new _LRUCache.LRUCache(10000);
  oneOffComponents = new Map();
  registerComponent(component) {
    if (!this.componentCache.has(component.customId)) {
      this.componentCache.set(component.customId, component);
    }
  }
  hasComponentWithKey(key) {
    for (const component of this.componentCache.values()) {
      const componentKey = component.customIdParser(component.customId).key;
      if (componentKey === key) {
        return true;
      }
    }
    return false;
  }
  findComponent(customId, componentType) {
    for (const component of this.componentCache.values()) {
      const componentKey = component.customIdParser(component.customId).key;
      const interactionKey = component.customIdParser(customId).key;
      if (componentKey === interactionKey && component.type === componentType) {
        return component;
      }
    }
    for (const component of this.componentCache.values()) {
      const componentKey = component.customIdParser(component.customId).key;
      if (componentKey === "*" && component.type === componentType) {
        return component;
      }
    }
    return undefined;
  }
  async handleInteraction(data) {
    const oneOffComponent = this.oneOffComponents.get(`${data.message.id}-${data.message.channel_id}`);
    if (oneOffComponent) {
      oneOffComponent.resolve(data.data);
      this.oneOffComponents.delete(`${data.message.id}-${data.message.channel_id}`);
      await this.client.rest.
      post(_v.Routes.interactionCallback(data.id, data.token), {
        body: {
          type: _v.InteractionResponseType.DeferredMessageUpdate
        }
      }).
      catch(() => {
        console.warn(`Failed to acknowledge one-off component interaction for message ${data.message.id}`);
      });
      return;
    }
    const component = this.findComponent(data.data.custom_id, data.data.component_type);
    if (!component) {
      throw new Error(`Unknown component with type ${data.data.component_type} and custom ID ${data.data.custom_id} was received, did you forget to register the component? See https://carbon.buape.com/concepts/component-registration for more information.`);
    }
    const parsed = component.customIdParser(data.data.custom_id);
    if (component instanceof _Button.Button) {
      const interaction = new _ButtonInteraction.ButtonInteraction(this.client, data, {
        ephemeral: typeof component.ephemeral === "function" ?
        false :
        component.ephemeral
      });
      // Resolve ephemeral setting if it's a function
      if (typeof component.ephemeral === "function") {
        interaction.setDefaultEphemeral(component.ephemeral(interaction));
      }
      // Resolve defer setting if it's a function
      const shouldDefer = typeof component.defer === "function" ?
      component.defer(interaction) :
      component.defer;
      if (shouldDefer)
      await interaction.defer();
      await component.run(interaction, parsed.data);
    } else
    if (component instanceof _RoleSelectMenu.RoleSelectMenu) {
      const interaction = new _RoleSelectMenuInteraction.RoleSelectMenuInteraction(this.client, data, {
        ephemeral: typeof component.ephemeral === "function" ?
        false :
        component.ephemeral
      });
      // Resolve ephemeral setting if it's a function
      if (typeof component.ephemeral === "function") {
        interaction.setDefaultEphemeral(component.ephemeral(interaction));
      }
      // Resolve defer setting if it's a function
      const shouldDefer = typeof component.defer === "function" ?
      component.defer(interaction) :
      component.defer;
      if (shouldDefer)
      await interaction.defer();
      await component.run(interaction, parsed.data);
    } else
    if (component instanceof _ChannelSelectMenu.ChannelSelectMenu) {
      const interaction = new _ChannelSelectMenuInteraction.ChannelSelectMenuInteraction(this.client, data, {
        ephemeral: typeof component.ephemeral === "function" ?
        false :
        component.ephemeral
      });
      // Resolve ephemeral setting if it's a function
      if (typeof component.ephemeral === "function") {
        interaction.setDefaultEphemeral(component.ephemeral(interaction));
      }
      // Resolve defer setting if it's a function
      const shouldDefer = typeof component.defer === "function" ?
      component.defer(interaction) :
      component.defer;
      if (shouldDefer)
      await interaction.defer();
      await component.run(interaction, parsed.data);
    } else
    if (component instanceof _MentionableSelectMenu.MentionableSelectMenu) {
      const interaction = new _MentionableSelectMenuInteraction.MentionableSelectMenuInteraction(this.client, data, {
        ephemeral: typeof component.ephemeral === "function" ?
        false :
        component.ephemeral
      });
      // Resolve ephemeral setting if it's a function
      if (typeof component.ephemeral === "function") {
        interaction.setDefaultEphemeral(component.ephemeral(interaction));
      }
      // Resolve defer setting if it's a function
      const shouldDefer = typeof component.defer === "function" ?
      component.defer(interaction) :
      component.defer;
      if (shouldDefer)
      await interaction.defer();
      await component.run(interaction, parsed.data);
    } else
    if (component instanceof _StringSelectMenu.StringSelectMenu) {
      const interaction = new _StringSelectMenuInteraction.StringSelectMenuInteraction(this.client, data, {
        ephemeral: typeof component.ephemeral === "function" ?
        false :
        component.ephemeral
      });
      // Resolve ephemeral setting if it's a function
      if (typeof component.ephemeral === "function") {
        interaction.setDefaultEphemeral(component.ephemeral(interaction));
      }
      // Resolve defer setting if it's a function
      const shouldDefer = typeof component.defer === "function" ?
      component.defer(interaction) :
      component.defer;
      if (shouldDefer)
      await interaction.defer();
      await component.run(interaction, parsed.data);
    } else
    if (component instanceof _UserSelectMenu.UserSelectMenu) {
      const interaction = new _UserSelectMenuInteraction.UserSelectMenuInteraction(this.client, data, {
        ephemeral: typeof component.ephemeral === "function" ?
        false :
        component.ephemeral
      });
      // Resolve ephemeral setting if it's a function
      if (typeof component.ephemeral === "function") {
        interaction.setDefaultEphemeral(component.ephemeral(interaction));
      }
      // Resolve defer setting if it's a function
      const shouldDefer = typeof component.defer === "function" ?
      component.defer(interaction) :
      component.defer;
      if (shouldDefer)
      await interaction.defer();
      await component.run(interaction, parsed.data);
    } else
    {
      throw new Error(`Unknown component with type ${data.data.component_type} and custom ID ${data.data.custom_id}`);
    }
  }
}exports.ComponentHandler = ComponentHandler; /* v9-f9b84131bd0d1529 */
