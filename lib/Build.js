const inquirer = require("inquirer");
const memFs = require("mem-fs");
const memFsEditor = require("mem-fs-editor");
const dataBase = require("./data");
const { getConfigKeys } = require("./config");

function Build(fileConfig) {
  this.config = fileConfig || {};
  this.init();
}

Build.prototype.init = function () {
  const { config = {} } = this;
  const [arrTplName, arrDataName] = getConfigKeys(config);

  if (!arrTplName.length) {
    console.log("你当前没有添加任何模版，请选择添加!");
    return;
  }

  inquirer
    .prompt([
      {
        type: "list",
        name: "tplName",
        message: "选择你要使用的模版:",
        choices: arrTplName,
      },
      {
        type: "list",
        name: "dataName",
        message: "选择模版中需要注入的数据:",
        choices: arrDataName,
      },
    ])
    .then(({ tplName, dataName }) => {
      this.create(config[tplName], {
        ...dataBase,
        ...config._default,
        ...config[dataName],
      }).then(() => {
        console.log(`${tplName} 创建成功`);
      });
    });
};

Build.prototype.create = function (dataTpl, baseData) {
  return new Promise((resolve) => {
    // 创建虚拟内存文件
    const store = memFs.create();
    const memFsE = memFsEditor.create(store);

    dataTpl.forEach(({ from, to, data }) => {
      memFsE.copyTpl(from, to, {
        data: { ...baseData, ...data },
      });
    });
    // 内存虚拟文件写入
    memFsE.commit(() => {
      resolve();
    });
  });
};

module.exports = Build;
