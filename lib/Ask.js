const path = require("path");
const fse = require("fs-extra");
const inquirer = require("inquirer");

function Ask(data) {
  this.data = data;
  this.init();
}

Ask.prototype.showAsk = function () {};

module.export = Ask;
