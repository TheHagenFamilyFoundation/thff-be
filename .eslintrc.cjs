module.exports = {
  "env": {
    "node": true,
    "es2021": true
  },
  "extends": "eslint:recommended",
  "overrides": [
    {
      "env": {
        "node": true
      },
      "files": [
        ".eslintrc.{js,cjs}"
      ],
      "parserOptions": {
        "sourceType": "script"
      }
    }
  ],
  "parser": "@babel/eslint-parser",
  "parserOptions": {
    "requireConfigFile": false,
    "ecmaVersion": "latest",
    "sourceType": "module",
    "importAttributes": true,
    'babelOptions': {
      'plugins': [
        '@babel/plugin-syntax-import-assertions'
      ],
    },
  },
  "rules": {
  }
}
