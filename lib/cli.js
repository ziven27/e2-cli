const config = require("./config");
const step1 = require("./step1");

(function () {
  config.getConfig().then((fileConfig) => step1(fileConfig));
})();
