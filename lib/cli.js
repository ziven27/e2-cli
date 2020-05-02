const config = require("./config");

(function () {
  config.getConfig().then((fileConfig) => {
    config.typeList(fileConfig);
  });
})();
