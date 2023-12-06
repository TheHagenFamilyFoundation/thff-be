import Logger from "./logger.js";

export const saltRounds = 10;

export const generateCode = () => {
  let code = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (let i = 0; i < 5; i += 1) {
    code += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  Logger.verbose(`Code Created ${code}`);

  return code;
}
