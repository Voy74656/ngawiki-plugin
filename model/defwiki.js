import gsCfg from '../../genshin/model/gsCfg.js'
import common from '../../../lib/common/common.js'
import lodash from 'lodash'
import fetch from 'node-fetch'

export class defwiki{
  constructor(){
    this.set = gsCfg.getConfig('mys', 'set')

    this.path = './data/strategy'

    this.url = 'https://bbs-api.mihoyo.com/post/wapi/getPostFullInCollection?&gids=2&order_type=2&collection_id='
    this.collection_id = [
      [],
      // 来源：西风驿站
      [839176, 839179, 839181, 1180811],
      // 来源：原神观测枢
      [813033],
      // 来源：派蒙喵喵屋
      [341284],
      // 来源：OH是姜姜呀(需特殊处理)
      [341523]
    ]

    this.source = ['西风驿站', '原神观测枢', '派蒙喵喵屋', 'OH是姜姜呀']

    this.oss = '?x-oss-process=image//resize,s_1200/quality,q_90/auto-orient,0/interlace,1/format,jpg'
  }
  /** 下载攻略图 */
  async getImg (name, group,sfPath) {
    let msyRes = []
    this.collection_id[group].forEach((id) => msyRes.push(this.getData(this.url + id)))

    try {
      msyRes = await Promise.all(msyRes)
    } catch (error) {
    //   this.e.reply('暂无攻略数据，请稍后再试')
      logger.error(`米游社接口报错：${error}}`)
      return false
    }

    let posts = lodash.flatten(lodash.map(msyRes, (item) => item.data.posts))
    let url
    for (let val of posts) {
      /** 攻略图个别来源特殊处理 */
      if (group == 4) {
        if (val.post.structured_content.includes(name + '】')) {
          let content = val.post.structured_content.replace(/\\\/\{\}/g, '')
          let pattern = new RegExp(name + '】.*?image":"(.*?)"')
          let imgId = pattern.exec(content)[1]
          for (let image of val.image_list) {
            if (image.image_id == imgId) {
              url = image.url
              break
            }
          }
          break
        }
      } else {
        if (val.post.subject.includes(name)) {
          let max = 0
          val.image_list.forEach((v, i) => {
            if (Number(v.size) >= Number(val.image_list[max].size)) max = i
          })
          url = val.image_list[max].url
          break
        }
      }
    }

    if (!url) {
    //   this.e.reply(`暂无${name}攻略（${this.source[group - 1]}）\n请尝试其他的攻略来源查询\n#攻略帮助，查看说明`)
      return false
    }

    logger.mark(` 下载${name}攻略图`)
    logger.mark([url + this.oss, sfPath])

    if (!await common.downFile(url + this.oss, sfPath)) {
      return false
    }

    logger.mark(` 下载${name}攻略成功`)

    return true
  }

  /** 获取数据 */
  async getData (url) {
    let response = await fetch(url, { method: 'get' })
    if (!response.ok) {
      return false
    }
    const res = await response.json()
    return res
  }

}

export default new defwiki()