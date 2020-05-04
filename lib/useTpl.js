const inquirer = require("inquirer");
const memFs = require("mem-fs");
const memFsEditor = require("mem-fs-editor");

const data_private = {
  date: new Date().toLocaleString(),
};

function save(dataTpl = [], data) {
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
}
function useTpl(configName, fileConfig) {
  const { default: data_default, ...otherNames } = fileConfig._data;
  const dataNames = Object.keys(otherNames);
  const { _data, template } = fileConfig[configName];

  const run = function (data = {}) {
    save(template, { ...data_private, ...data, ..._data }).then(() => {
      console.log(`${configName} 使用成功!`);
    });
  };

  if (!dataNames.length) {
    run(data_default);
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
      run(
        action == "不添加数据"
          ? data_default
          : { ...data_default, ...fileConfig._data[action] }
      );
    });
}
module.exports = useTpl;
