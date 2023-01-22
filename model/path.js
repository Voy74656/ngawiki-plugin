import path from 'path'

const _path = process.cwd().replace(/\\/g, '/')

// 插件名
const pluginName = path.basename(path.join(import.meta.url, '../../'))
// 插件根目录
const pluginRoot = path.join(_path, 'plugins', pluginName)
// 插件资源目录
const pluginResources = path.join(pluginRoot, 'resources')

const yunzaiWikiPath =  path.join(_path, '/data/strategy')



const htmlDir = path.join(pluginResources, 'html')
const tplFile = path.join(htmlDir, 'ngaWiki.html')

export {
  _path,
  pluginName,
  pluginRoot,
  pluginResources,
  yunzaiWikiPath,
  htmlDir,
  tplFile
}