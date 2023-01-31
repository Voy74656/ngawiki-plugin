import fs from 'node:fs'
import { segment } from 'oicq'
import MarkdownIt from "markdown-it"

import plugin from "../../../lib/plugins/plugin.js";
import gsCfg from "../../genshin/model/gsCfg.js";

import  defwiki from '../model/defwiki.js';
import puppeteer from "../../../lib/puppeteer/puppeteer.js"

import { _path, pluginResources ,yunzaiWikiPath, tplFile, htmlDir, pluginName } from "../model/path.js";
import setting from "../model/setting.js";

const md = new MarkdownIt()

export class wiki extends plugin {
  constructor() {
    super({
      name: 'nga攻略',
      event: 'message',
      priority: 400,
      rule: [
        {
          reg: '^#?设置默认攻略([0-4])?$',
          fnc: 'wiki_setting'
        },{
          reg: '^#?(更新)?\\S+攻略([0-4])?$',
          fnc: 'wiki_get'
        },
        {
          reg: '^#?攻略(说明|帮助)?$',
          fnc: 'wiki_help'
        }
      ]
    })
    this.info = 'By NGA 【全角色圣遗物及武器搭配简述】，可能有更新延迟，最新版本参见 https://ngabbs.com/read.php?tid=27859119&_fu=63489594%2C1'
  }
  
  // 获取配置单
  get appconfig() { return setting.getConfig("ngaWiki") }

  // 口令设置配置
  set appconfig(setter) { setting.setConfig("ngaWiki", setter); }
  set getImg(name) {if(this.group==0){this._render_nga_wiki(name)}else{defwiki.getImg(name,this.group)}}

  async wiki_help() {
    await this.e.reply('攻略帮助:\n#心海攻略[01234]\n#更新早柚攻略[01234]\n#设置默认攻略[01234]\n示例: 心海攻略4\n\n攻略来源:\n0——NGA原神版\n1——西风驿站\n2——原神观测枢\n3——派蒙喵喵屋\n4——OH是姜姜呀')
  }

  /** #设置默认攻略1 */
  async wiki_setting() {
    let match = /^#?设置默认攻略([0-4])?$/.exec(this.e.msg)
    let index = Number(match[1])
    if (isNaN(index)) {
      await this.e.reply('默认攻略设置方式为: \n#设置默认攻略[01234] \n 请增加数字0-4其中一个')
      return
    }

    if (!(this.appconfig.defaultSource == index)) {
      let cfg = await setting.getConfig('ngaWiki')
      cfg.defaultSource = index
      if (([1, 2, 3, 4]).includes(index)) {
        let setting = gsCfg.getConfig('mys', 'set');
        setting.defaultSource = index;
        gsCfg.setConfig('mys', 'set', setting);
      }
      await this.appconfig(setting)
    }

    await this.e.reply('默认攻略已设置为: ' + match[1])
  }

  async wiki_get() {
    let match = /^#?(更新)?(\S+)攻略([0-4])?$/.exec(this.e.msg)
    let isUpdate = !!match[1]
    let _new_role = await this._regrolename(match[2])
    this.roleName = _new_role.name
    this._element = _new_role.element
    if (this.roleName == null || this.roleName === '') return

    let _allGroups = ['0', '1', '2', '3', '4']
    this.group = _allGroups.includes(match[3]) ? match[3] : this.appconfig.defaultSource

    this.sfPath = `${yunzaiWikiPath}/${this.group}/${this.roleName}.jpg`

    if (fs.existsSync(this.sfPath) && !isUpdate) {
      logger.info(`wiki image exist in ${this.sfPath}`)
      await this.e.reply(segment.image(`file://${this.sfPath}`))
      return
    }
    logger.info(`generating wiki image to ${this.sfPath}`)

    if (this.group == 0 && await this._render_nga_wiki(this.roleName)) {
      await this.e.reply(segment.image(`file://${this.sfPath}`))
      return
    }

    if (!(this.group == 0) && await defwiki.getImg(this.roleName, this.group,this.sfPath)) {
      await this.e.reply(segment.image(`file://${this.sfPath}`))
    }
  }

  async _regrolename(str) {
    let _element =''
    let role = gsCfg.getRole(str)
    if (!role) return false
    /** 主角特殊处理 */
    if (['10000005', '10000007', '20000000'].includes(String(role.roleId))) {
      let travelers = ['风主', '岩主', '雷主', '草主']
      if (!travelers.includes(role.alias)) {
        let msg = '请选择：'
        for (let sub of travelers) {
          msg += `${sub}攻略、`
        }
        msg = msg.substring(0, msg.lastIndexOf('、'))
        await this.e.reply(msg)
        return ''
      } else {
        role.name = role.alias
        _element = role.alias.substr(0, 1)
      }
    }else{
      _element = gsCfg.getElementByRoleName(role.name)
    }
    return {name:role.name,element:_element}
  }


  async _render_nga_wiki(roleName) {
    let element = await gsCfg.getElementByRoleName(roleName)
    if (!fs.existsSync(`./plugins/${pluginName}/resources/markdown/${roleName}.md`)) {
      this.e.reply(`暂无${roleName}攻略（${this.group==0? 'NGA':defwiki.source[this.group-1]}）\n请尝试其他的攻略来源查询\n#攻略帮助，查看说明`)
      return false
    }
    
    let Markdown = md.render(fs.readFileSync(`./plugins/${pluginName}/resources/markdown/${roleName}.md`, "utf-8"))
    
    try{
      let img = await puppeteer.screenshot(
        "nga攻略",
        { tplFile, 
          htmlDir, 
          Markdown, 
          element: this._element, 
          roleName: this.roleName,
          path:this.sfPath, 
          pluResPath: `${_path}/plugins/ngawiki-plugin/resources/`,  
          fullPage: true }
      )
      fs.writeFileSync(this.sfPath, img.file)
      return true
    }catch (error) {
      this.e.reply('暂无攻略数据，请稍后再试')
      logger.error(`NGA攻略接口报错：${error}}`)
      return false
    }
  }
}



