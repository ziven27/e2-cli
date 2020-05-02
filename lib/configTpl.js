const inquirer = require("inquirer");
const config = require("./config");

module.exports = {
  getNameList: function (fileConfig) {
    return Object.keys(fileConfig).filter((item) => item.charAt(0) !== "_");
  },
  viewList: function (fileConfig) {
    const arrDataName = this.getNameList(fileConfig);
    inquirer
      .prompt([
        {
          type: "rawlist",
          name: "action",
          message: "模版列表:",
          choices: ["返回", ...arrDataName],
        },
      ])
      .then(({ action }) => {
        if (action === "返回") {
          // step1(fileConfig);
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
            return console.log(fileConfig[dataName]);
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
  getTplItems: function () {
    return new Promise((resolve) => {
      const _it = this;
      const userInput = [];
      const ask = function () {
        inquirer
          .prompt([
            {
              type: "input",
              name: "from",
              message: `请输入 ejs 模版路径`,
            },
            {
              type: "input",
              name: "to",
              message: `请输入目标路径`,
            },
            {
              type: "confirm",
              name: "needData",
              message: "是否需要添加数据?",
            },
          ])
          .then(({ from, to, needData }) => {
            const item = {
              from: from.trim(),
              to: to.trim(),
            };
            if (needData) {
              item.data = _it.getKeyValue();
            }
            userInput.push(item);
            inquirer
              .prompt([
                {
                  type: "confirm",
                  name: "askAgain",
                  message: "是否需要添加数据?",
                },
              ])
              .then(({ askAgain }) => {
                if (askAgain) {
                  ask();
                } else {
                  resolve(userInput);
                }
              });
          });
      };
      ask();
    });
  },
  add: function (fileConfig) {
    const listNames = this.getNameList(fileConfig);

    inquirer
      .prompt([
        {
          type: "input",
          name: "tplName",
          message: function () {
            listNames.length && console.log("模版列表:" + listNames);
            return "请输入要添加模版的名称:";
          },
          validate: function (value) {
            if (listNames.includes(value)) {
              return `${value} 已存在，请重新输入`;
            } else if (!value.match(/^[a-zA-Z][a-zA-Z0-9]+/i)) {
              return "数据名称只能标准英文数字";
            }
            return true;
          },
        },
      ])
      .then(({ listNames }) => {
        this.getTplItems().then(() => {});
      });
  },
  edit: function (configName, fileConfig) {
    const dataName = `_${configName}`;
    const dataOld = fileConfig[dataName];
    console.log(dataOld);
    this.getKeyValue(configName).then((data) => {
      fileConfig[dataName] = { ...dataOld, ...data };
      config.saveConfig(fileConfig).then(() => {
        console.log(`${configName} 编辑成功`);
        console.log(data);
        this.viewList(fileConfig);
      });
    });
  },
};
