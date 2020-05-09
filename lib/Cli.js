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
          to: 'src/components/<%= data.componentName %>/index.js',
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

  // 使用模版
  this.program
    .command('u <tplName>')
    .alias('use')
    .description('使用模版 <模版名称>')
    .action((tplName) => {
      this.askData().then(({ dataName }) => {
        this.useTpl(tplName, dataName);
      });
    });

  this.program
    .command('vt [tplName]')
    .alias('view-tpl')
    .description('查看模版 [模版名称] 没有名称表示查看列表')
    .action((tplName) => {
      if (tplName) {
        this.viewTplItem(tplName.trim());
      } else {
        this.viewTplList();
      }
    });

  this.program
    .command('at <tplName>')
    .alias('add-tpl')
    .description('添加模版 <模版名称>')
    .requiredOption('-f, --from <dir>', 'EJS 模版源文件路径')
    .requiredOption('-t, --to <dir>', 'EJS 编译之后目标文件路径')
    .action((tplName, { from, to }) => {
      this.addTpl(tplName.trim(), from, to);
    });

  this.program
    .command('atd <tplName>')
    .alias('add-tpl-data')
    .description('添加模版数据 <模版名称>')
    .requiredOption('-k, --key <tplDataName>', '要添加的模版数据字段名')
    .requiredOption('-v, --value <tplDataValue>', '要添加的模版数据字段值')
    .action((tplName, { key, value }) => {
      this.addTplData(tplName.trim(), key, value);
    });

  this.program
    .command('ata <tplName>')
    .alias('add-tpl-ask')
    .description('添加模版问题 <模版名称>')
    .requiredOption('-k, --key <tplAskName>', '要添加的模版问题字段名')
    .requiredOption('-m, --message <tplAskMsg>', '要添加的模版问题备注')
    .action((tplName, { key, message }) => {
      this.addTplAsk(tplName.trim(), key, message);
    });

  // 删除模版;
  this.program
    .command('rt <tplName>')
    .alias('remove-tpl')
    .description('删除模版 <模版名>')
    .action((tplName) => {
      this.delTpl(tplName.trim());
    });

  this.program
    .command('vd [dataName]')
    .alias('view-data')
    .description('查看数据列表 [数据名称] 没有名称表示查看列表')
    .action((dataName) => {
      if (dataName) {
        this.viewDataItem(dataName.trim());
      } else {
        this.viewDataList();
      }
    });

  this.program
    .command('ad <dataName>')
    .alias('add-data')
    .description('添加数据 <数据>')
    .requiredOption('-k, --key <dataNameKey>', '要添加的数据字段名')
    .requiredOption('-v, --value <dataNameValue>', '要添加的数据字段值')
    .action((dataName, { dataNameKey, dataNameValue }) => {
      this.addData(dataName.trim(), { [dataNameKey]: dataNameValue });
    });

  this.program
    .command('rd <dataName>')
    .alias('remove-data')
    .description('删除数据 <数据名>')
    .action((dataName) => {
      this.delData(dataName.trim());
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
    const { [item]: { template: tpl = [] } = {} } = fileConfig;
    return {
      name: `${item}${tpl.length === 0 ? ' (该模版为空)' : ''}`,
      value: item,
    };
  });

  inquirer
    .prompt([
      {
        type: 'rawlist',
        name: 'tplName',
        message: '模版列表:',
        choices: ['退出', ...choices],
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

  const choices = [
    '退出',
    {
      name: '返回模版列表',
      value: 'back',
    },
  ];

  if (!isEmpty) {
    choices.push({
      name: '使用',
      value: 'use',
    });
  }

  choices.push({
    name: '删除',
    value: 'del',
  });

  const message = `${tplName}${
    isEmpty ? '(还没有添加模版)' : ''
  }:\n${JSON.stringify(tpl, null, '  ')}`;

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
        this.askData().then(({dataName}) => {
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
    const renderData = { data };

    dataTpl.forEach(({ from, to }) => {
      const compileFrom = ejs.render(from, renderData);
      const compileTo = ejs.render(to, renderData);
      memFsE.copyTpl(compileFrom, compileTo, renderData);
    });
    // 内存虚拟文件写入
    memFsE.commit(() => {
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
  console.log(renderData);
  const compile = (data) => {
    this.compile(template, data).then(() => {
      console.log(`模版 ${tplName} 使用成功!`);
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
