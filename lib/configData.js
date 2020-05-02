const inquirer = require("inquirer");
const config = require("./config");
const step1 = require("./step1");

module.exports = {
  getNameList: function (fileConfig) {
    return Object.keys(fileConfig)
      .filter((item) => item.charAt(0) === "_")
      .map((item) => item.substr(1));
  },
  viewList: function (fileConfig) {
    const arrDataName = this.getNameList(fileConfig);
    inquirer
      .prompt([
        {
          type: "rawlist",
          name: "action",
          message: "数据列表:",
          choices: ["返回", ...arrDataName],
        },
      ])
      .then(({ action }) => {
        if (action === "返回") {
          step1(fileConfig);
        } else {
          this.viewItem(action, fileConfig);
        }
      });
  },
  viewItem: function (dataName, fileConfig) {
    inquirer
      .prompt([
        {
          type: "rawlist",
          name: "action",
          message: function () {
            return console.log(fileConfig[`_${dataName}`]);
          },
          choices:
            dataName === "default"
              ? ["返回", "编辑"]
              : ["返回", "编辑", "删除"],
        },
      ])
      .then(({ action }) => {
        if (action === "返回") {
          this.viewList(fileConfig);
        } else if (action === "编辑") {
          this.edit(dataName, fileConfig);
        } else if (action === "删除") {
          this.del(dataName, fileConfig);
        }
      });
  },
  getKeyValue: function () {
    return new Promise((resolve) => {
      const userInput = {};
      const ask = function () {
        inquirer
          .prompt([
            {
              type: "input",
              name: "input",
              message: `请输入"字段名:字段值"同名会被覆盖:`,
              validate: function (input) {
                if (!(input && input.trim())) {
                  return "字段不能为空";
                }
                const [name, value] = input.split(":");
                if (!value.trim()) {
                  return "数据不能为空";
                } else if (!name.match(/^[a-zA-Z][a-zA-Z0-9]+/i)) {
                  return "数据名称只能标准英文数字";
                }
                return true;
              },
            },
            {
              type: "confirm",
              name: "askAgain",
              message: "继续添加?",
            },
          ])
          .then(({ input, askAgain }) => {
            const [name, value] = input.split(":");
            userInput[name.trim()] = value.trim();
            if (askAgain) {
              ask();
            } else {
              resolve(userInput);
            }
          });
      };
      ask();
    });
  },
  del: function (configName, fileConfig) {
    const { [`_${configName}`]: dataDel, ...otherConfig } = fileConfig;
    config.saveConfig(otherConfig).then(() => {
      this.viewList(otherConfig);
    });
  },
  add: function (fileConfig) {
    const dataNames = this.getNameList(fileConfig);
    inquirer
      .prompt([
        {
          type: "input",
          name: "name",
          message: function () {
            console.log("数据列表:" + dataNames);
            return "请输入要添加数据的名称:";
          },
          validate: function (value) {
            if (dataNames.includes(value)) {
              return `${value} 已存在，请重新输入`;
            } else if (!value.match(/^[a-zA-Z][a-zA-Z0-9]+/i)) {
              return "数据名称只能标准英文数字";
            }
            return true;
          },
        },
      ])
      .then(({ name }) => {
        this.getKeyValue().then((data) => {
          fileConfig[`_${name.trim()}`] = data;
          config.saveConfig(fileConfig).then(() => {
            console.log(data);
            console.log(`数据 ${name} 添加成功`);
            this.viewList(fileConfig);
          });
        });
      });
  },
  edit: function (configName, fileConfig) {
    const dataName = `_${configName}`;
    const dataOld = fileConfig[dataName];
    this.getKeyValue(configName).then((data) => {
      fileConfig[dataName] = { ...dataOld, ...data };
      config.saveConfig(fileConfig).then(() => {
        console.log(`${configName} 编辑成功`);
        console.log(fileConfig[dataName]);
        this.viewList(fileConfig);
      });
    });
  },
};
