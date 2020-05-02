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
      arrDataName.push(item.substr(1));
    } else {
      arrTplName.push(item);
    }
  });

  return [arrTplName, arrDataName];
}

const saveConfig = function (fileConfig) {
  const pathConfig = getConfigPath();
  return fse.writeJson(pathConfig, fileConfig, { spaces: 2 });
};

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
  saveConfig,
  getConfig,
  getConfigKeys,
};
