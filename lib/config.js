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
            name: "input",
            message: `请输入「 name:value 」`,
            validate: function (input) {
              const [name] = input.split(":");
              if (name.match(/^[a-zA-Z][a-zA-Z0-9]+/i)) {
                return true;
              }
              return "数据名称只能标准英文数字";
            },
          },
          {
            type: "confirm",
            name: "askAgain",
            message: "继续添加?",
            default: true,
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

const saveConfig = function (fileConfig, msg) {
  const pathConfig = getConfigPath();
  fse
    .writeJson(pathConfig, fileConfig, { spaces: 2 })
    .then(() => {
      console.log(msg || "配置保存成功!");
    })
    .catch((err) => {
      console.error(err);
    });
};

const data = {
  inquirer: function (configName, fileConfig) {
    inquirer
      .prompt([
        {
          type: "expand",
          name: "name",
          message: console.table({
            [configName]: fileConfig[configName],
          }),
          choices: [
            {
              key: "e",
              name: "编辑",
              value: "edit",
            },
            {
              key: "d",
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
          message: "请输入要添加数据的名称:",
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
          fileConfig[`_${name.trim()}`] = data;
          saveConfig(fileConfig, `${name} 添加成功`);
        });
      });
  },
  del: function (configName, fileConfig) {
    const { [configName]: dataDel, ...otherConfig } = fileConfig;
    saveConfig(otherConfig, `${configName} 删除成功`);
  },
  edit: function (configName, fileConfig) {
    getKeyValue(configName).then((data) => {
      fileConfig[`${configName.trim()}`] = data;
      saveConfig(fileConfig, `${configName} 编辑成功`);
    });
  },
};

const tpl = {
  inquirer: function (configName, fileConfig) {
    inquirer
      .prompt([
        {
          type: "expand",
          name: "name",
          message: console.table(fileConfig[configName]),
          choices: [
            {
              key: "e",
              name: "编辑",
              value: "edit",
            },
            {
              key: "d",
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
          name: "tplName",
          message: "请输入要添加模版的名称:",
          validate: function (value) {
            if (value.match(/^[a-zA-Z][a-zA-Z0-9]+/i)) {
              return true;
            }
            return "模版名称只能标准英文数字";
          },
        },
        {
          type: "confirm",
          name: "isExist",
          message: "该模版已存在是否继续",
          when: function (answers) {
            return !!fileConfig[answers.tplName];
          },
        },
      ])
      .then((answers) => {
        console.log(JSON.stringify(answers, null, "  "));
      });
  },
  del: function () {},
  edit: function () {},
};

function stepData(fileConfig) {
  const arrDataName = getConfigKeys(fileConfig)[1];

  inquirer
    .prompt([
      {
        type: "rawlist",
        name: "configName",
        message: "请选择:",
        choices: ["添加数据", ...arrDataName],
      },
    ])
    .then(({ configName }) => {
      if (configName === "添加数据") {
        data.add(fileConfig);
      } else {
        data.inquirer(configName, fileConfig);
      }
    });
}

function stepTpl(fileConfig) {
  const [arrTplName] = getConfigKeys(fileConfig);

  inquirer
    .prompt([
      {
        type: "rawlist",
        name: "configName",
        message: "请选择:",
        choices: ["添加模版", ...arrTplName],
      },
    ])
    .then(({ configName }) => {
      if (configName === "添加模版") {
        tpl.add(fileConfig);
      } else {
        tpl.inquirer(configName, fileConfig);
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

function getConfig() {
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
  stepData,
  stepTpl,
  getConfig,
  getConfigKeys,
};
