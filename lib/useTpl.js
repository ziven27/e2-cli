const memFs = require("mem-fs");
const memFsEditor = require("mem-fs-editor");

function useTpl(dataTpl = [], dataBase = {}) {
  return new Promise((resolve) => {
    // 创建虚拟内存文件
    const store = memFs.create();
    const memFsE = memFsEditor.create(store);

    dataTpl.forEach(({ from, to, data }) => {
      memFsE.copyTpl(from, to, {
        data: { ...dataBase, ...data },
      });
    });
    // 内存虚拟文件写入
    memFsE.commit(() => {
      resolve();
    });
  });
}

module.exports = useTpl;
