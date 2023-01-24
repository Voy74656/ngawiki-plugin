logger.info('---------QAQ---------')
logger.info(`正在加载 NGA Wiki图鉴 插件 @Voyager 整理`)

import { pluginName, _path, yunzaiWikiPath } from "./model/path.js";
import fs from "fs";

logger.info('---------QAQ---------')
logger.info(`正在加载 NGA Wiki图鉴 插件 @Voyager 整理`)

if (!fs.existsSync(`${_path}/config/`)) {
  fs.mkdirSync(`${_path}/config/`);
}

let apps = {}
const files = fs.readdirSync(`./plugins/${pluginName}/apps`).filter((file) => file.endsWith('.js'))
logger.info(files)
for (let file of files) {
  // logger.info(file)
  let name = file.replace('.js', '')
  apps[name] = (await import(`./apps/${file}`))[name]
}

let index = { ngawiki: {} }
export const ngawiki = index.ngawiki || {}

export { apps }