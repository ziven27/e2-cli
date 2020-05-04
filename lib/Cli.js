const fse = require("fs-extra");
const path = require("path");
const inquirer = require("inquirer");
const memFs = require("mem-fs");
const memFsEditor = require("mem-fs-editor");

function Cli() {
  // 配置文件名
  this.FILE_NAME = "e2.config.json";

  // 默认配置文件
  this.CONFIG_DEFAULT = {
    _data: {
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
  };
  // 配置文件的映射
  this.fileConfig = {};
  // 获取当前命令的执行目录，注意和项目目录区分
  const cwd = process.cwd();
  // 用户输入命令时创建的项目目录
  this.pathConfig = path.join(cwd, this.FILE_NAME);
  // 初始化
  this.init();
}

Cli.prototype.init = function () {
  // 读取配置文件
  fse
    .readJson(this.pathConfig)
    .then((fileConfig) => {
      // 缓存配置文件
      this.fileConfig = fileConfig;
      this.typeList();
    })
    .catch(() => {
      // 没有配置文件，拿默认文件写入
      fse
        .writeJson(this.FILE_NAME, this.CONFIG_DEFAULT, { spaces: 2 })
        .then(() => {
          console.log(`已为你添加配置文件 ${this.FILE_NAME}`);
          this.fileConfig = this.CONFIG_DEFAULT;
          this.typeList();
        });
    });
};

/**
 * 显示第一步
 */
Cli.prototype.typeList = function () {
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
        this.viewTplList();
      } else if (action === "查看数据") {
        this.viewDataList();
      }
    });
};

/**
 * 获取数据名称列表
 * @returns {string[]}
 */
Cli.prototype.getDataNames = function () {
  const { _data = {} } = this.fileConfig;
  return Object.keys(_data);
};
/**
 * 获取模版名称列表
 * @returns {string[]}
 */
Cli.prototype.getTplNames = function () {
  const { fileConfig = {} } = this;
  return Object.keys(fileConfig).filter((item) => item.charAt(0) !== "_");
};

/**
 * 获取键值对
 * @returns {Promise<unknown>}
 */
Cli.prototype.getKeyValue = function () {
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
};
/**
 * 添加数据
 */
Cli.prototype.addData = function () {
  const dataNames = this.getDataNames();
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
          if (dataNames.includes(`${value.trim()}`)) {
            return `${value} 已存在，请重新输入`;
          } else if (!value.match(/^[a-zA-Z][a-zA-Z0-9]+/i)) {
            return "数据名称只能标准英文数字";
          }
          return true;
        },
      },
    ])
    .then(({ name }) => {
      this.fileConfig._data[name] = {};
      this.saveConfig().then(() => {
        this.viewDataList();
      });
    });
};
/**
 * 添加模版
 */
Cli.prototype.addTpl = function () {
  const { fileConfig } = this;
  const dataNames = this.getTplNames();
  inquirer
    .prompt([
      {
        type: "input",
        name: "name",
        message: function () {
          dataNames.length && console.log("模版列表:" + dataNames);
          return "请输入要添加模版的名称:";
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
      fileConfig[`${name.trim()}`] = {
        _data: {},
        template: [],
      };
      this.saveConfig(fileConfig).then(() => {
        this.viewTplList(fileConfig);
      });
    });
};
/**
 * 编辑数据
 * @param configName 数据名称
 */
Cli.prototype.editData = function (configName) {
  const { fileConfig } = this;
  const {
    _data: { [configName]: dataOld },
  } = fileConfig;
  this.getKeyValue().then((data) => {
    fileConfig._data[configName] = { ...dataOld, ...data };
    this.saveConfig(fileConfig).then(() =>
      this.viewDataItem(configName, fileConfig)
    );
  });
};
/**
 * 删除模版
 * @param configName
 * @returns {Promise<unknown>}
 */
Cli.prototype.delTpl = function (configName) {
  delete this.fileConfig[configName];
  return this.saveConfig();
};
/**
 * 删除数据
 * @param configName
 * @returns {Promise<unknown>}
 */
Cli.prototype.delData = function (configName) {
  if (configName === "default") {
    this.fileConfig._data.default = {};
  } else {
    delete this.fileConfig._data[configName];
  }
  return this.saveConfig();
};
/**
 * 保存配置
 * @returns {Promise<unknown>}
 */
Cli.prototype.saveConfig = function () {
  const { fileConfig, pathConfig } = this;
  return new Promise((resolve) => {
    fse.writeJson(pathConfig, fileConfig, { spaces: 2 }).then(() => {
      resolve();
    });
  });
};
/**
 * 查看模版列表
 */
Cli.prototype.viewTplList = function () {
  const { fileConfig } = this;
  const arrName = this.getTplNames();
  const choiceNames = arrName.map((item) => {
    const isEmpty =
      !fileConfig[item].template || fileConfig[item].template.length === 0;
    return {
      name: `${item}${isEmpty ? " 还没有添加模版" : ""}`,
      value: item,
    };
  });
  inquirer
    .prompt([
      {
        type: "rawlist",
        name: "action",
        message: "模版列表:",
        choices: ["返回", "添加", ...choiceNames],
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
};
/**
 * 查看模版
 * @param configName
 */
Cli.prototype.viewTplItem = function (configName) {
  const { fileConfig } = this;
  const isNotEmpty =
    fileConfig[configName].template && fileConfig[configName].template.length;
  const choices = isNotEmpty ? ["返回", `使用`, `删除`] : ["返回", `删除`];
  inquirer
    .prompt([
      {
        type: "rawlist",
        name: "action",
        message: isNotEmpty
          ? JSON.stringify(fileConfig[configName], null, "  ")
          : `${configName} 还没有添加模版, 请去 ${this.FILE_NAME} 添加`,
        choices,
      },
    ])
    .then(({ action }) => {
      if (action === "返回") {
        this.viewTplList(fileConfig);
      } else if (action === "删除") {
        this.delTpl(configName, fileConfig).then((data) => {
          this.viewTplList(data);
        });
      } else if (action === "使用") {
        this.useTpl(configName, fileConfig);
      }
    });
};
Cli.prototype.compile = function (dataTpl = [], data) {
  console.log(data);
  return new Promise((resolve) => {
    // 创建虚拟内存文件
    const store = memFs.create();
    const memFsE = memFsEditor.create(store);

    dataTpl.forEach(([from, to]) =>
      memFsE.copyTpl(from, to, {
        data,
      })
    );
    // 内存虚拟文件写入
    memFsE.commit(() => {
      resolve();
    });
  });
};

Cli.prototype.getCompileData = function (_data, dataName) {
  const DATA_PRIVATE = {
    date: new Date().toLocaleString(),
  };
  const { default: data_default, ...otherData } = this.fileConfig._data;
  return dataName
    ? { ...DATA_PRIVATE, ...data_default, ...otherData[dataName], ..._data }
    : { ...DATA_PRIVATE, ...data_default, ..._data };
};

Cli.prototype.useTpl = function (configName) {
  const { fileConfig } = this;
  const { default: data_default, ...otherNames } = fileConfig._data;
  const dataNames = Object.keys(otherNames);
  const { _data, template } = fileConfig[configName];

  const run = (dataName) => {
    this.compile(template, this.getCompileData(_data, dataName)).then(() => {
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
      run(action == "不添加数据" ? null : action);
    });
};
/**
 * 查看数据列表
 */
Cli.prototype.viewDataList = function () {
  const fileConfig = this.fileConfig;
  const arrName = this.getDataNames();
  const choiceNames = arrName.map((item) => {
    return {
      name: `${item}:${JSON.stringify(fileConfig._data[item])}`,
      value: item,
    };
  });
  inquirer
    .prompt([
      {
        type: "rawlist",
        name: "action",
        message: "数据列表:",
        choices: ["返回", "添加", ...choiceNames],
      },
    ])
    .then(({ action }) => {
      if (action === "返回") {
        this.typeList();
      } else if (action === "添加") {
        this.addData();
      } else {
        this.viewDataItem(action);
      }
    });
};
/**
 * 查看数据
 * @param configName
 */
Cli.prototype.viewDataItem = function (configName) {
  const {
    fileConfig: {
      _data: { [configName]: thisData },
    },
  } = this;

  inquirer
    .prompt([
      {
        type: "rawlist",
        name: "action",
        message: `${configName}:${JSON.stringify(thisData)}`,
        choices: [
          "返回",
          "编辑",
          {
            name: configName === "default" ? "清空" : "删除",
            value: "删除",
          },
        ],
      },
    ])
    .then(({ action }) => {
      if (action === "返回") {
        this.viewDataList();
      } else if (action === "编辑") {
        this.editData(configName);
      } else if (action === "删除") {
        this.delData(configName).then(() => this.viewDataList());
      }
    });
};

module.exports = Cli;
