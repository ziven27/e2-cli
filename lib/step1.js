const configTpl = require("./configTpl");
const configData = require("./configData");
const inquirer = require("inquirer");
const Build = require("./Build");
function step1(fileConfig) {
  inquirer
    .prompt([
      {
        type: "rawlist",
        name: "action",
        message: "请选择:",
        choices: [
          "使用模版",
          "查看模版",
          "添加模版",
          "查看数据",
          "添加数据",
          "退出",
        ],
      },
    ])
    .then(({ action }) => {
      if (action === "使用模版") {
        new Build(fileConfig);
      } else if (action === "查看模版") {
        configTpl.viewList(fileConfig);
      } else if (action === "添加模版") {
        configTpl.add(fileConfig);
      } else if (action === "查看数据") {
        configData.viewList(fileConfig);
      } else if (action === "添加数据") {
        configData.add(fileConfig);
      }
    });
}
module.exports = step1;
