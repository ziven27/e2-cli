const fse = require('fs-extra');
const path = require('path');
const inquirer = require('inquirer');
const memFs = require('mem-fs');
const memFsEditor = require('mem-fs-editor');
const ejs = require('ejs');

// 默认配置
const G_DATA = {
  config: {
    // 配置文件名
    fileName: 'e2.config.json',
    data: {
      _data: {
        version: '1.0.0',
      },
      component: {
        _description: '添加组件',
        _data: {
          tplName: 'component',
        },
        _ask: [
          {
            message: '请输入组件名称:',
            name: 'componentName',
          },
        ],
        template: [
          {
            from: 'e2-tpl/components/Component',
            to: 'src/components/<%= e2.ttc(e2.componentName) %>',
          },
        ],
      },
      page: {
        _description: '添加页面',
        _data: {
          tplName: 'page',
        },
        _ask: [
          {
            message: '请输入页面名称:',
            name: 'pageName',
          },
        ],
        template: [
          {
            from: 'e2-tpl/pages/page',
            to: 'src/pages/<%= e2.ttc(e2.pageName) %>',
          },
        ],
      },
      ejs: {
        _description: '测试 disabledEjs ',
        _data: {
          tplName: 'page',
        },
        _ask: [
          {
            message: '请输入页面名称:',
            name: 'pageName',
          },
        ],
        template: [
          {
            from: 'e2-tpl/pages/ejs/index.html',
            to: 'src/pages/<%= e2.ttl(e2.pageName) %>/index.html',
            disabledEjs: true,
          },
        ],
      },
    },
  },
  data: {
    // 默认数据名
    fileName: '.e2.data.json',
    data: {},
  },
  tpl: {
    // 文件夹目录
    dirName: 'e2-tpl',
  },
  private: {
    date: new Date().toLocaleDateString(),
    ttc: function (str = '') {
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    },
    ttl: function (str = '') {
      return str.toLowerCase();
    },
  },
};

function Cli() {
  // 配置文件的映射
  this.fileConfig = {};

  // 默认数据的映射
  this.fileData = {};

  // 初始化
  this.init();
}

/**
 * 获取项目目录
 * @returns {Promise<string|boolean>}
 */
Cli.prototype.getRootPath = async function () {
  // 获取当前命令的执行目录，注意和项目目录区分
  const cwd = process.cwd();
  let arrCwd = cwd.split('/');
  while (arrCwd.length > 1) {
    const pathThisDir = arrCwd.join('/');
    const pathPackage = path.join(pathThisDir, 'package.json');
    // 是否在项目根目录运行
    const exists = await fse.pathExists(pathPackage);
    if (exists) {
      return pathThisDir;
    }
    arrCwd.pop();
  }
  return false;
};

/**
 * 初始化
 */
Cli.prototype.init = async function () {
  const rootPath = await this.getRootPath();
  if (!rootPath) {
    console.log('未找到包含 package.json文件都项目目录!');
    return;
  }
  this.rootPath = rootPath;
  this.fileConfig = await this.getFileConfig(
    path.join(rootPath, G_DATA.config.fileName),
  );
  this.fileData = await this.getFileData(
    path.join(rootPath, G_DATA.data.fileName),
  );
  await this.createTplDir(path.join(rootPath, G_DATA.tpl.dirName));
  this.viewTplList();
};

/**
 * 创建模版目录
 * @param pathName
 * @returns {Promise<boolean>}
 */
Cli.prototype.createTplDir = async function (pathName) {
  try {
    return await fse.pathExists(pathName);
  } catch (e) {
    const from = path.join(__dirname, '../e2-tpl');
    await fse.copy(from, pathName);
    console.log(`已为你创建默认存放模版的文件夹：${pathName}`);
    return true;
  }
  return false;
};

/**
 * 获取数据
 * @param pathFile
 * @returns {Promise<{authorName: *}|*>}
 */
Cli.prototype.getFileData = async function (pathFile) {
  try {
    return await fse.readJson(pathFile);
  } catch (e) {}
  const { authorName } = await inquirer.prompt([
    {
      type: 'input',
      name: 'authorName',
      message: '你的名字:',
      validate: function (input) {
        if (!!input.trim()) {
          return true;
        }
        return '名字不能为空，请重新输入：';
      },
    },
  ]);
  // 创建默认数据
  const data_default = { ...G_DATA.data.data, authorName };
  // 文件没有读取成功，直接用默认文件创建
  await fse.writeJson(pathFile, data_default, {
    spaces: 2,
  });
  console.log(`已为你添加数据文件: ${pathFile}`);
  return data_default;
};

/**
 * 获取文件配置
 * @param pathFile
 * @returns {Promise<config>}
 */
Cli.prototype.getFileConfig = async function (pathFile) {
  // 尝试读取配置文件
  try {
    return await fse.readJson(pathFile);
  } catch (errRead) {}

  // 没有找到配置文件尝试创建
  await fse.writeJson(pathFile, G_DATA.config.data, {
    spaces: 2,
  });
  console.log(`已为你添加默认配置文件: ${pathFile}`);
  return G_DATA.config.data;
};

/**
 * 获取模版名称列表
 * @returns {string[]}
 */
Cli.prototype.getTplNames = function () {
  const { fileConfig = {} } = this;
  return Object.keys(fileConfig).filter((item) => item.charAt(0) !== '_');
};

/**
 * 查看模版列表
 */
Cli.prototype.viewTplList = function () {
  const { fileConfig } = this;
  const arrName = this.getTplNames();

  if (!arrName.length) {
    console.log(
      `❌ 你还没有添加任何模版！请去${G_DATA.config.fileName} 添加模版！ \n`,
    );
    return;
  }

  const choices = arrName.map((item) => {
    const {
      [item]: { _description = '', template: tpl = [] } = {},
    } = fileConfig;

    // 如果模版为空，表示不能选择
    if (tpl.length === 0) {
      return {
        name: `${item}: 空模版`,
        value: `${item}: 空模版`,
      };
    }
    const tplStr = tpl.map(({ from, to, disabledEjs }) => {
      return `${from} => ${to}${disabledEjs ? ' disabledEjs' : ''}`;
    });

    return {
      name: `${!!_description ? _description : item}: ${tplStr.join('; ')}`,
      value: item,
    };
  });

  inquirer
    .prompt([
      {
        type: 'rawlist',
        name: 'tplName',
        message: '选择你要使用的模版 ( 上下或输入数字选择 / cmd+z 取消 ) :',
        choices: [...choices, '取消: cmd+z'],
      },
    ])
    .then(({ tplName }) => {
      // 用户选择取消，则什么都不做
      if (
        !tplName ||
        tplName.indexOf('取消') > -1 ||
        tplName.indexOf('空模版') > -1
      ) {
        return;
      }
      // 使用模版
      this.useTpl(tplName);
    });
};

/**
 * 写入模版
 * @param dataTpl
 * @param data
 * @returns {Promise<any>}
 */
Cli.prototype.compile = async function (dataTpl = [], data = {}) {
  // 创建虚拟内存文件
  const store = memFs.create();
  const memFsE = memFsEditor.create(store);
  const renderData = { e2: data };

  const results = [];
  for (let i = 0; i < dataTpl.length; i++) {
    const { from, to, disabledEjs = false } = dataTpl[i];
    const compileTo = ejs.render(to.replace(/@/g, this.rootPath), renderData);
    const exists = await fse.pathExists(compileTo);
    if (exists) {
      results.push({
        path: compileTo,
        msg: '已存在',
      });
    } else {
      const compileFrom = ejs.render(
        path.join(this.rootPath, from),
        renderData,
      );
      results.push({
        path: compileTo,
      });
      // 不使用 ejs
      if (disabledEjs) {
        await memFsE.copy(compileFrom, compileTo);
      } else {
        await memFsE.copyTpl(compileFrom, compileTo, renderData);
      }
    }
  }

  // 内存虚拟文件写入
  if (results.length) {
    await memFsE.commit(() => {});
  }
  results.forEach(({ path, msg }) => {
    if (msg) {
      console.log('\033[32mx \033[0m' + path + ' ' + msg);
    } else {
      console.log('\033[32m✔ \033[0m' + path);
    }
  });
};

/**
 * 使用模版
 * @param tplName
 * @param dataName
 */
Cli.prototype.useTpl = async function (tplName) {
  const { [tplName]: { template = [], _ask = [] } = {} } = this.fileConfig;
  let appendData = {};
  // 询问用户输入
  if (_ask.length > 0) {
    appendData = await inquirer.prompt(
      _ask.map((item) => ({ type: 'input', ...item })),
    );
  }
  const {
    fileData: {},
    fileConfig: { _data = {}, [tplName]: { _data: tplData = {} } = {} } = {},
  } = this;
  const renderData = {
    // 私有默认数据
    ...G_DATA.private,
    // 默认数据
    ..._data,
    // .e2.data.json 的数据
    ...this.fileData,
    // 模版独有的数据
    ...tplData,
    ...appendData,
  };
  await this.compile(template, renderData);
};

module.exports = Cli;
