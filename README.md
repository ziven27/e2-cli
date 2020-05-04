# e2-cli

Compile any file with ejs

## install

```bash
$ npm install e2-cli -g
$ es-cli
```

## config

```JSON
{
  "_data": {
    "default": {},
    "user1": {
      "name": "user1"
    }
  },
  "index": {
    "_data": {
      "projectName": "hello world"
    },
    "template": [
      /*["From","TO"],*/
      ["src/html/index.html", "dist/html/index.html"],
      ["src/static/css/index.css", "dist/static/css/index.css"],
      ["src/static/js/index.js", "dist/static/js/index.js"]
    ]
  }
}
```

```js
const DATA_PRIVATE = {
  date: new Date().toLocaleString(),
};
```

the ejs data form `{...DATA_PRIVATE,..._data.default,..._data.user1, ...index._data }`.

the `_data.user1` is optional in `e2-cli`.
