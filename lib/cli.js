const config = require("./config");
const step1 = require("./step1");

(function () {
  config.initConfig().then((fileConfig, pathConfig) => {
    step1(fileConfig, pathConfig);
  });
})();
