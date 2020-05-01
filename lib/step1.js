const inquirer = require("inquirer");
const Build = require("./Build");
const config = require("./config.js");

module.exports = function step1(fileConfig, pathConfig) {
  inquirer
    .prompt([
      {
        type: "rawlist",
        name: "operate",
        message: "请选择：",
        choices: [
          { name: "Build / 使用模版", value: "build" },
          { name: "Config / 查看配置", value: "config" },
          new inquirer.Separator("-----------------------"),
          { name: "Exit / 退出", value: "exit" },
        ],
      },
    ])
    .then(({ operate }) => {
      if (operate === "build") {
        new Build(fileConfig);
      } else if (operate === "config") {
        config.stepConfig(fileConfig, pathConfig);
      }
    });
};
