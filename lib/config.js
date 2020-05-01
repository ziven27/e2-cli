const inquirer = require("inquirer");
const fse = require("fs-extra");
const path = require("path");

// 配置文件名
const FILE_NAME = "e2.config.json";

// 默认配置
const CONFIG_DEFAULT = {
  _default: {},
};

function getConfigKeys(fileConfig) {
  const arrTplName = [];
  const arrDataName = [];

  Object.keys(fileConfig).forEach((item) => {
    // 表示数据
    if (item.charAt(0) === "_") {
      // _data 作为默认参数
      item !== "_default" && arrDataName.push(item);
    } else {
      arrTplName.push(item);
    }
  });

  return [arrTplName, arrDataName];
}

const getKeyValue = function (dataName) {
  return new Promise((resolve) => {
    const userInput = {};
    const ask = function () {
      inquirer
        .prompt([
          {
            type: "input",
            name: "name",
            message: `请输入要往${dataName}添加的 key 值`,
            validate: function (value) {
              if (value.match(/^[a-zA-Z][a-zA-Z0-9]+/i)) {
                return true;
              }
              return "数据名称只能标准英文数字";
            },
          },
          {
            type: "input",
            name: "value",
            message: `请输入要往${dataName}添加的 value 值`,
          },
          {
            type: "confirm",
            name: "askAgain",
            message: "继续添加?",
            default: true,
          },
        ])
        .then(({ name, value, askAgain }) => {
          userInput[name] = value;
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

const data = {
  inquirer: function (configName, fileConfig) {
    inquirer
      .prompt([
        {
          type: "rawlist",
          name: "name",
          message: `你选择了数据「${configName}」：`,
          choices: [
            {
              name: "编辑",
              value: "edit",
            },
            {
              name: "删除",
              value: "del",
            },
          ],
        },
      ])
      .then(({ name }) => {
        this[name](configName, fileConfig);
      });
  },
  add: function (fileConfig) {
    inquirer
      .prompt([
        {
          type: "input",
          name: "name",
          message: "请输入要添加数据的名称",
          validate: function (value) {
            if (value.match(/^[a-zA-Z][a-zA-Z0-9]+/i)) {
              return true;
            }
            return "数据名称只能标准英文数字";
          },
        },
      ])
      .then(({ name }) => {
        getKeyValue(name).then((data) => {
          fileConfig[`_${name}`] = data;
          console.log(fileConfig);
        });
      });
  },
  del: function () {},
  edit: function () {},
};

const tpl = {
  inquirer: function (configName, fileConfig) {
    inquirer
      .prompt([
        {
          type: "rawlist",
          name: "name",
          message: `你选择了模版「${configName}」：`,
          choices: [
            {
              name: "编辑",
              value: "edit",
            },
            {
              name: "删除",
              value: "del",
            },
          ],
        },
      ])
      .then(({ name }) => {
        this[name](configName, fileConfig);
      });
  },
  add: function (fileConfig) {
    console.log("tpl add");
  },
  del: function () {},
  edit: function () {},
};

function stepConfig(fileConfig) {
  const [arrTplName, arrDataName] = getConfigKeys(fileConfig);
  let choices = ["添加模版", "添加数据"];

  // 当配置里面的数据存在时才可以选中
  if (arrDataName.length) {
    choices = [...choices, new inquirer.Separator("数据列表:"), ...arrDataName];
  }

  // 当配置里面的模版存在时才可以选中
  if (arrTplName.length) {
    choices = [...choices, new inquirer.Separator("模版列表:"), ...arrTplName];
  }

  inquirer
    .prompt([
      {
        type: "rawlist",
        name: "configName",
        message: "请选择：",
        choices: choices,
      },
    ])
    .then(({ configName }) => {
      if (configName === "添加模版") {
        tpl.add(fileConfig);
      } else if (configName === "添加数据") {
        data.add(fileConfig);
      } else {
        const isData = configName.charAt(0) === "_";
        isData
          ? data.inquirer(configName, fileConfig)
          : tpl.inquirer(configName, fileConfig);
      }
    });
}

function getConfigPath() {
  // 获取当前命令的执行目录，注意和项目目录区分
  const cwd = process.cwd();
  // 用户输入命令时创建的项目目录
  const pathConfig = path.join(cwd, FILE_NAME);

  return pathConfig;
}

function initConfig() {
  return new Promise((resolve, reject) => {
    const pathConfig = getConfigPath();
    fse
      .readJson(pathConfig)
      .then((fileConfig) => {
        resolve(fileConfig, pathConfig);
      })
      .catch(() => {
        fse
          .writeJson(FILE_NAME, CONFIG_DEFAULT)
          .then(() => {
            resolve(CONFIG_DEFAULT, pathConfig);
          })
          .catch((err) => {
            reject(err);
          });
      });
  });
}

module.exports = {
  fileName: FILE_NAME,
  stepConfig,
  initConfig,
  getConfigKeys,
};
