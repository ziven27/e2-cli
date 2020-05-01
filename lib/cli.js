const config = require("./config");
const inquirer = require("inquirer");
const Build = require("./Build");

(function () {
  config.getConfig().then((fileConfig) => {
    inquirer
      .prompt([
        {
          type: "rawlist",
          name: "operate",
          message: "请选择:",
          choices: ["使用模版", "查看模版", "查看数据", "退出"],
        },
      ])
      .then(({ operate }) => {
        if (operate === "使用模版") {
          new Build(fileConfig);
        } else if (operate === "查看数据") {
          config.stepData(fileConfig);
        } else if (operate === "查看模版") {
          config.stepTpl(fileConfig);
        }
      });
  });
})();
