const fse = require("fs-extra");
const path = require("path");
const inquirer = require("inquirer");
const useTpl = require("./useTpl");

module.exports = {
  // 配置文件名
  FILE_NAME: "e2.config.json",
  // 默认配置文件
  CONFIG_DEFAULT: {
    data: {
      default: {
        version: "1.0.0",
      },
      user1: {
        name: "user1",
      },
      user2: {
        name: "user2",
      },
    },
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
  getConfigPath: function () {
    // 获取当前命令的执行目录，注意和项目目录区分
    const cwd = process.cwd();
    // 用户输入命令时创建的项目目录
    const pathConfig = path.join(cwd, this.FILE_NAME);
    return pathConfig;
  },
  getDataNames: function (fileConfig) {
    return Object.keys(fileConfig._data);
  },
  getTplNames: function (fileConfig) {
    return Object.keys(fileConfig).filter((item) => item.charAt(0) !== "_");
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
        fileConfig._data = { ...fileConfig._data, [name]: {} };
        this.saveConfig(fileConfig).then(() => {
          this.viewDataList(fileConfig);
        });
      });
  },
  addTpl: function (fileConfig) {
    const dataNames = this.getTplNames(fileConfig);
    inquirer
      .prompt([
        {
          type: "input",
          name: "name",
          message: function () {
            console.log("模版列表:" + dataNames);
            return "请输入要添加数据的名称):";
          },
          validate: function (value) {
            if (dataNames.includes(`_${value.trim()}`)) {
              return `${value} 已存在，请重新输入`;
            } else if (!value.match(/^[a-zA-Z][a-zA-Z0-9]+/i)) {
              return "模版名称只能是英文开头的英文或数字";
            }
            return true;
          },
        },
      ])
      .then(({ name }) => {
        fileConfig[`${name.trim()}`] = {};
        this.saveConfig(fileConfig).then(() => {
          this.viewTplList(fileConfig);
        });
      });
  },
  editData: function (configName, fileConfig) {
    const {
      _data: { [configName]: dataOld },
    } = fileConfig;
    this.getKeyValue(configName).then((data) => {
      fileConfig._data[configName] = { ...dataOld, ...data };
      this.saveConfig(fileConfig).then(() => {
        console.log(`${configName} 编辑成功`);
        console.log({
          [configName]: fileConfig._data[configName],
        });
        this.viewDataItem(configName, fileConfig);
      });
    });
  },
  editTpl: function (configName, fileConfig) {
    const dataOld = fileConfig[configName];
    const saveData = (thisData) => {
      fileConfig[configName] = {
        ...dataOld,
        ...thisData,
      };
      this.saveConfig(fileConfig).then((data) => {
        console.log(data);
        this.viewTplItem(configName, data);
      });
    };
    inquirer
      .prompt([
        {
          type: "input",
          name: "from",
          message: `输入 ejs 模版目录(从${this.FILE_NAME}开始):`,
        },
        {
          type: "input",
          name: "to",
          message: `输入模版目标目录(从${this.FILE_NAME}开始):`,
        },
        {
          type: "confirm",
          name: "askData",
          message: "是否需要添加数据?",
        },
      ])
      .then(({ from, to, askData }) => {
        // 需要路径
        if (askData) {
          this.getKeyValue().then((userInput) => {
            saveData({
              from,
              to,
              data: userInput,
            });
          });
          return;
        }
        saveData({
          from,
          to,
        });
      });
  },
  delTpl: function (configName, fileConfig) {
    const { [configName]: dataDel, ...otherConfig } = fileConfig;
    return this.saveConfig(otherConfig);
  },
  delData: function (configName, fileConfig) {
    const { [configName]: dataDel, ...otherData } = fileConfig._data;
    fileConfig._data = otherData;
    return this.saveConfig(fileConfig);
  },
  saveConfig: function (fileConfig) {
    const pathConfig = this.getConfigPath();
    return new Promise((resolve) => {
      fse.writeJson(pathConfig, fileConfig, { spaces: 2 }).then(() => {
        resolve(fileConfig);
      });
    });
  },
  viewTplList: function (fileConfig) {
    const arrName = this.getTplNames(fileConfig);
    inquirer
      .prompt([
        {
          type: "rawlist",
          name: "action",
          message: "模版列表:",
          choices: ["返回", "添加", ...arrName],
        },
      ])
      .then(({ action }) => {
        if (action === "返回") {
          this.typeList(fileConfig);
        } else if (action === "添加") {
          this.addTpl(fileConfig);
        } else {
          this.viewTplItem(action, fileConfig);
        }
      });
  },
  useTpl: function (configName, fileConfig) {
    const dataNames = this.getDataNames(fileConfig).filter(
      (item) => item !== "_default"
    );

    const run = function (data = {}) {
      useTpl(fileConfig[configName], data).then(() => {
        console.log(`${configName} 使用成功!`);
      });
    };

    if (!dataNames.length) {
      run();
      return;
    }
    inquirer
      .prompt([
        {
          type: "rawlist",
          name: "action",
          message: "选择需要额外添加的数据(_default数据会自动添加):",
          choices: ["不添加数据", ...dataNames],
        },
      ])
      .then(({ action }) => {
        run(action == "不添加数据" ? {} : fileConfig[action]);
      });
  },
  viewTplItem: function (configName, fileConfig) {
    const choices = fileConfig[configName].length
      ? ["返回", "使用模版", "编辑模版", "删除模版"]
      : ["返回", "编辑模版", "删除模版"];
    const message = fileConfig[configName].length
      ? configName + "：" + JSON.stringify(fileConfig[configName], null, "  ")
      : `${configName} 还未添加配置，请选择编辑或删除:`;
    inquirer
      .prompt([
        {
          type: "rawlist",
          name: "action",
          message,
          choices,
        },
      ])
      .then(({ action }) => {
        if (action === "返回") {
          this.viewTplList(fileConfig);
        } else if (action === "编辑模版") {
          this.editTpl(configName, fileConfig);
        } else if (action === "删除模版") {
          this.delTpl(configName, fileConfig).then((data) => {
            this.viewTplList(data);
          });
        } else if (action === "使用模版") {
          this.useTpl(configName, fileConfig);
        }
      });
  },
  viewDataList: function (fileConfig) {
    const arrName = this.getDataNames(fileConfig);
    inquirer
      .prompt([
        {
          type: "rawlist",
          name: "action",
          message: "数据列表:",
          choices: ["返回", "添加", ...arrName],
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
  viewDataItem: function (configName, fileConfig) {
    inquirer
      .prompt([
        {
          type: "rawlist",
          name: "action",
          message:
            configName +
            ":" +
            JSON.stringify(fileConfig._data[configName], null, "  "),
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
          this.delData(configName, fileConfig).then((data) => {
            this.viewDataList(data);
          });
        }
      });
  },
};
