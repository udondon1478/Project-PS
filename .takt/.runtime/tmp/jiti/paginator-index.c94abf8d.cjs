"use strict";Object.defineProperty(exports, "__esModule", { value: true });var _exportNames = { GoToPageModal: true, Paginator: true };Object.defineProperty(exports, "GoToPageModal", { enumerable: true, get: function () {return _GoToPageModal.GoToPageModal;} });Object.defineProperty(exports, "Paginator", { enumerable: true, get: function () {return _Paginator.Paginator;} });var _Client = require("../../classes/Client.js");
var _GoToPageModal = require("./GoToPageModal.js");






Object.keys(_GoToPageModal).forEach(function (key) {if (key === "default" || key === "__esModule") return;if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;if (key in exports && exports[key] === _GoToPageModal[key]) return;Object.defineProperty(exports, key, { enumerable: true, get: function () {return _GoToPageModal[key];} });});var _Paginator = require("./Paginator.js");
Object.keys(_Paginator).forEach(function (key) {if (key === "default" || key === "__esModule") return;if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;if (key in exports && exports[key] === _Paginator[key]) return;Object.defineProperty(exports, key, { enumerable: true, get: function () {return _Paginator[key];} });});Object.assign(_Client.Client.prototype, { Paginator: _Paginator.Paginator, paginators: [] }); /* v9-a36fb066f8c31f25 */
