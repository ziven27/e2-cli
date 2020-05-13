const fse = require('fs-extra');
const path = require('path');
const inquirer = require('inquirer');
const memFs = require('mem-fs');
const memFsEditor = require('mem-fs-editor');
const ejs = require('ejs');
const { Command } = require('commander');

function Cli() {
  // 配置文件名
  this.FILE_NAME = 'e2.config.json';

  // 默认配置文件
  this.CONFIG_DEFAULT = {
    _data: {
      default: {
        version: '1.0.0',
      },
      user1: {
        userName: 'user1',
      },
      user2: {
        userName: 'user2',
      },
    },
    example: {
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
          from: 'demo/components/Component/index.js',
          to: 'src/components/<%= e2.componentName %>/index.js',
        },
      ],
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

/**
 * 初始化
 */
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
 * 显示命令行
 */
Cli.prototype.typeList = function () {
  this.program = new Command();
  this.program.helpOption('-h, --help', '帮助');

  this.program
    .command('vt')
    .description('查看模版列表')
    .action(() => {
      this.viewTplList();
    });

  this.program
    .command('vd')
    .description('查看数据列表')
    .action(() => {
      this.viewDataList();
    });

  this.program.on('--help', () => {
    console.log('');
    console.log('样例:');
    console.log('  $ npx e2-cli vt 查看模版列表');
    console.log('  $ npx e2-cli vd 查看数据列表');
  });

  // 解析参数
  this.program.parse(process.argv);
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
 * 添加模版数据
 * @param tplName
 * @param tplDataName
 * @param tplDataValue
 */
Cli.prototype.addTplData = function (tplName, tplDataName, tplDataValue) {
  const { fileConfig = {} } = this;
  const { [tplName]: tpl = {} } = fileConfig;
  const { _data = {}, ...others } = tpl;
  _data[tplDataName] = tplDataValue;
  this.fileConfig[tplName] = { _data, ...others };
  this.saveConfig().then(() => this.viewTplItem(tplName));
};

/**
 * 添加模版问题
 * @param tplName
 * @param tplAskName
 * @param tplAskMsg
 */
Cli.prototype.addTplAsk = function (tplName, tplAskName, tplAskMsg) {
  const { fileConfig = {} } = this;
  const { [tplName]: tpl = {} } = fileConfig;
  const { _ask = [], ...others } = tpl;

  // 不能重名
  const newAsk = _ask.filter(({ name }) => name !== tplAskName);
  newAsk.push({
    message: tplAskMsg,
    name: tplAskName,
  });
  this.fileConfig[tplName] = { _ask: newAsk, ...others };
  this.saveConfig().then(() => this.viewTplItem(tplName));
};

/**
 * 添加数据
 * @param dataName
 * @param data
 */
Cli.prototype.addData = function (dataName, data) {
  const { fileConfig = {} } = this;
  const { [dataName]: dataOld = {} } = fileConfig;
  this.fileConfig._data[dataName] = { ...dataOld, ...data };
  this.saveConfig().then(() => this.viewDataList());
};

/**
 * 添加模版
 * @param name
 * @param from
 * @param to
 */
Cli.prototype.addTpl = function (name, from, to) {
  const fileConfig = this.fileConfig;
  const {
    [name]: data = {
      _data: {},
      template: [],
    },
  } = fileConfig;
  data.template.push({
    from,
    to,
  });
  fileConfig[name] = data;
  this.saveConfig().then(() => {
    this.viewTplList(fileConfig);
  });
};

/**
 * 删除模版
 * @param configName
 * @param onSuccess
 */
Cli.prototype.delTpl = function (
  configName,
  onSuccess = () => this.viewTplList(),
) {
  delete this.fileConfig[configName];
  this.saveConfig().then(() => {
    onSuccess();
  });
};

/**
 * 删除数据
 * @param dataName
 * @param onSuccess
 */
Cli.prototype.delData = function (
  dataName,
  onSuccess = () => {
    this.viewDataList();
  },
) {
  if (dataName === 'default') {
    this.fileConfig._data.default = {};
  } else {
    delete this.fileConfig._data[dataName];
  }
  this.saveConfig().then(() => {
    console.log(`${dataName} 删除成功`);
    onSuccess();
  });
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

  if (!arrName.length) {
    console.log('❌ 你还没有添加任何模版！\n');
    this.program.help();
  }

  const choices = arrName.map((item) => {
    const { [item]: { _tip = '', template: tpl = [] } = {} } = fileConfig;
    let name = item;
    // 显示提示文案
    if (!!_tip) {
      name = `${item}: ${_tip}`;
    } else if (tpl.length === 0) {
      name = `${item}: 该模版为空`;
    }
    return {
      name: name,
      value: item,
    };
  });

  inquirer
    .prompt([
      {
        type: 'rawlist',
        name: 'tplName',
        message: '模版列表:',
        choices: [...choices, '退出'],
      },
    ])
    .then(({ tplName }) => {
      tplName !== '退出' && this.viewTplItem(tplName);
    });
};
/**
 * 查看模版
 * @param tplName
 */
Cli.prototype.viewTplItem = function (tplName) {
  const { [tplName]: tpl } = this.fileConfig;
  const isEmpty = !(tpl.template && tpl.template.length);

  const choices = [];

  if (!isEmpty) {
    choices.push({
      name: '使用',
      value: 'use',
    });
  }
  choices.push({
    name: '返回模版列表',
    value: 'back',
  });
  choices.push({
    name: '删除',
    value: 'del',
  });
  choices.push('退出');

  const message = `${tplName}${
    isEmpty ? '(还没有添加模版)' : ''
  }:\n${JSON.stringify(tpl.template, null, '  ')}`;

  inquirer
    .prompt([
      {
        type: 'rawlist',
        name: 'action',
        message,
        choices,
      },
    ])
    .then(({ action }) => {
      if (action === 'back') {
        this.viewTplList();
      } else if (action === 'use') {
        this.askData().then(({ dataName }) => {
          this.useTpl(tplName, dataName);
        });
      } else if (action === 'del') {
        this.delTpl(tplName);
      }
    });
};

/**
 * 编辑模版
 * @param dataTpl
 * @param data
 * @returns {Promise<any>}
 */
Cli.prototype.compile = function (dataTpl = [], data) {
  return new Promise((resolve) => {
    // 创建虚拟内存文件
    const store = memFs.create();
    const memFsE = memFsEditor.create(store);
    const renderData = { e2: data };

    const results = [];
    dataTpl.forEach(({ from, to, disabledEjs = false }) => {
      const compileFrom = ejs.render(from, renderData);
      const compileTo = ejs.render(to, renderData);
      results.push(compileTo);

      // 不使用 ejs
      if (disabledEjs) {
        memFsE.copy(compileFrom, compileTo);
      } else {
        memFsE.copyTpl(compileFrom, compileTo, renderData);
      }
    });
    // 内存虚拟文件写入
    memFsE.commit(() => {
      results.forEach((item) => {
        console.log('\033[32m ✔ \033[0m' + item);
      });
      resolve();
    });
  });
};

/**
 * 是否需要数据
 * @returns {Promise<never> | *}
 */
Cli.prototype.askData = function () {
  const { _data = {} } = this.fileConfig;

  const dataNameList = Object.keys(_data)
    .filter((item) => item !== 'default')
    .map((item) => ({
      name: `${item}: ${JSON.stringify(_data[item])}`,
      value: item,
    }));

  return inquirer.prompt([
    {
      type: 'rawlist',
      name: 'dataName',
      message: '选择需要添加的数据:',
      choices: [
        {
          name: '不需要数据',
          value: null,
        },
        ...dataNameList,
      ],
    },
  ]);
};

/**
 * 使用模版
 * @param tplName
 * @param dataName
 */
Cli.prototype.useTpl = function (tplName, dataName = null) {
  const DATA_PRIVATE = {
    date: new Date().toLocaleDateString(),
    ttc: function (str = '') {
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    },
    ttl: function (str = '') {
      return str.toLowerCase();
    },
  };
  const {
    _data: { default: data_default, [dataName]: thisData = {} },
    [tplName]: { _data, template, _ask } = {},
  } = this.fileConfig;
  const renderData = {
    ...DATA_PRIVATE,
    ...data_default,
    ...thisData,
    ..._data,
  };
  const compile = (data) => {
    this.compile(template, data).then(() => {
      console.log(`${tplName}: 创建成功!`);
    });
  };
  if (_ask.length > 0) {
    _ask.map((item) => ({ type: 'input', ...item }));
    inquirer
      .prompt(_ask)
      .then((answer) => compile({ ...renderData, ...answer }));
  } else {
    compile(renderData);
  }
};

/**
 * 查看数据
 * @param dataName
 */
Cli.prototype.viewDataItem = function (dataName) {
  const {
    _data: { [dataName]: data },
  } = this.fileConfig;

  inquirer
    .prompt([
      {
        type: 'rawlist',
        name: 'action',
        message: `${dataName}: ${JSON.stringify(data)}`,
        choices: [
          {
            name: '返回',
            value: 'back',
          },
          {
            name: '删除',
            value: 'del',
          },
        ],
      },
    ])
    .then(({ action }) => {
      if (action === 'back') {
        this.viewDataList();
      } else if (action === 'del') {
        this.delData(dataName);
      }
    });
};

/**
 * 查看数据列表
 */
Cli.prototype.viewDataList = function () {
  const { _data } = this.fileConfig;
  if (JSON.stringify(_data) === '{}') {
    console.log('❌ 你还没有添加任何数据！\n');
    this.program.help();
    return;
  }

  const choices = Object.entries(_data).map(([dataName, data]) => {
    return {
      name: `${dataName}: ${JSON.stringify(data)}`,
      value: dataName,
    };
  });

  inquirer
    .prompt([
      {
        type: 'rawlist',
        name: 'dataName',
        message: '模版列表:',
        choices: ['退出', ...choices],
      },
    ])
    .then(({ dataName }) => {
      dataName !== '退出' && this.viewDataItem(dataName);
    });
};

module.exports = Cli;
