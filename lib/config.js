const fse = require("fs-extra");
const path = require("path");
const inquirer = require("inquirer");

const configTpl = {
  tplAdd: function () {},

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

module.exports = {
  // 配置文件名
  FILE_NAME: "e2.config.json",
  // 默认配置文件
  CONFIG_DEFAULT: {
    _default: {},
  },
  typeList: function (fileConfig) {
    inquirer
      .prompt([
        {
          type: "rawlist",
          name: "action",
          message: `请选择一下操作: `,
          choices: ["查看模版", "查看数据"],
        },
      ])
      .then(({ action }) => {
        if (action === "查看模版") {
          this.viewTplList(fileConfig);
        } else if (action === "查看数据") {
          this.viewDataList(fileConfig);
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
  addData: function (fileConfig) {
    const dataNames = this.getDataNames(fileConfig);
    inquirer
      .prompt([
        {
          type: "input",
          name: "name",
          message: function () {
            console.log("数据列表:" + dataNames);
            return "请输入要添加数据的名称(不用输入下划线):";
          },
          validate: function (value) {
            if (dataNames.includes(`_${value.trim()}`)) {
              return `${value} 已存在，请重新输入`;
            } else if (!value.match(/^[a-zA-Z][a-zA-Z0-9]+/i)) {
              return "数据名称只能标准英文数字";
            }
            return true;
          },
        },
      ])
      .then(({ name }) => {
        fileConfig[`_${name.trim()}`] = {};
        this.saveConfig(fileConfig).then(() => {
          this.viewDataList(fileConfig);
        });
      });
  },
  editData: function (configName, fileConfig) {
    const dataOld = fileConfig[configName];
    this.getKeyValue(configName).then((data) => {
      fileConfig[configName] = { ...dataOld, ...data };
      this.saveConfig(fileConfig).then(() => {
        console.log(`${configName} 编辑成功`);
        console.log(fileConfig[configName]);
        this.viewList(fileConfig);
      });
    });
  },
  del: function (configName, fileConfig) {
    const { [configName]: dataDel, ...otherConfig } = fileConfig;
    return this.saveConfig(otherConfig);
  },
  getConfigPath: function () {
    // 获取当前命令的执行目录，注意和项目目录区分
    const cwd = process.cwd();
    // 用户输入命令时创建的项目目录
    const pathConfig = path.join(cwd, this.FILE_NAME);

    return pathConfig;
  },
  saveConfig: function (fileConfig) {
    const pathConfig = this.getConfigPath();
    return new Promise((resolve) => {
      fse.writeJson(pathConfig, fileConfig, { spaces: 2 }).then(() => {
        resolve(fileConfig);
      });
    });
  },
  getConfig: function () {
    return new Promise((resolve, reject) => {
      const pathConfig = this.getConfigPath();
      fse
        .readJson(pathConfig)
        .then((fileConfig) => {
          resolve(fileConfig, pathConfig);
        })
        .catch(() => {
          fse
            .writeJson(this.FILE_NAME, CONFIG_DEFAULT)
            .then(() => {
              console.log(`已为你添加配置文件 ${this.FILE_NAME}`);
              resolve(CONFIG_DEFAULT, pathConfig);
            })
            .catch((err) => {
              reject(err);
            });
        });
    });
  },
  getConfigKeys: function (fileConfig) {
    const arrTplName = [];
    const arrDataName = [];

    Object.keys(fileConfig).forEach((item) => {
      // 表示数据
      if (item.charAt(0) === "_") {
        arrDataName.push(item);
      } else {
        arrTplName.push(item);
      }
    });

    return [arrTplName, arrDataName];
  },
  viewList: function (fileConfig) {
    const [arrTplName, arrDataName] = this.getConfigKeys(fileConfig);
    inquirer
      .prompt([
        {
          type: "rawlist",
          name: "configName",
          message: `${this.FILE_NAME}:`,
          choices: [
            new inquirer.Separator("模版列表:"),
            ...arrTplName,
            new inquirer.Separator("数据列表:"),
            ...arrDataName,
            "添加数据",
          ],
        },
      ])
      .then(({ configName }) => {
        if (configName === "添加数据") {
          this.dataAdd(fileConfig);
          return;
        }
        const isData = configName.charAt(0) === "_";
        if (isData) {
          this.viewDataItem(configName, fileConfig);
        } else {
          this.viewTplItem(configName, fileConfig);
        }
      });
  },
  viewDataItem: function (configName, fileConfig) {
    inquirer
      .prompt([
        {
          type: "rawlist",
          name: "action",
          message: JSON.stringify(fileConfig[configName], null, "  "),
          choices:
            configName === "_default"
              ? ["返回", "编辑"]
              : ["返回", "编辑", "删除"],
        },
      ])
      .then(({ action }) => {
        if (action === "返回") {
          this.viewDataList(fileConfig);
        } else if (action === "编辑") {
          this.editData(configName, fileConfig);
        } else if (action === "删除") {
          this.del(configName, fileConfig).then((data) => {
            this.viewDataList(data);
          });
        }
      });
  },
  viewTplList: function (fileConfig) {
    const arrName = Object.keys(fileConfig).filter(
      (item) => item.charAt(0) !== "_"
    );
    inquirer
      .prompt([
        {
          type: "rawlist",
          name: "action",
          message: "模版列表:",
          choices: [
            "返回",
            "添加",
            new inquirer.Separator("模版列表:"),
            ...arrName,
          ],
        },
      ])
      .then(({ action }) => {
        if (action === "返回") {
          this.typeList(fileConfig);
        } else if (action === "添加") {
          this.tplAdd(fileConfig);
        } else {
          this.viewItem(action, fileConfig);
        }
      });
  },
  getDataNames: function (fileConfig) {
    return Object.keys(fileConfig).filter((item) => item.charAt(0) === "_");
  },
  viewDataList: function (fileConfig) {
    const arrName = this.getDataNames(fileConfig);
    inquirer
      .prompt([
        {
          type: "rawlist",
          name: "action",
          message: "模版列表:",
          choices: [
            "返回",
            "添加",
            new inquirer.Separator("数据列表:"),
            ...arrName,
          ],
        },
      ])
      .then(({ action }) => {
        if (action === "返回") {
          this.typeList(fileConfig);
        } else if (action === "添加") {
          this.addData(fileConfig);
        } else {
          this.viewDataItem(action, fileConfig);
        }
      });
  },
};
