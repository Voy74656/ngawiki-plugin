import { exec } from "child_process";
import fs from "fs";
import path from "path";

import plugin from "../../../lib/plugins/plugin.js";
import puppeteer from "../../../lib/puppeteer/puppeteer.js";

import {
  pluginRoot,
  yunzaiWikiPath,
  pluginResources,
  mdPath,
} from "../model/path.js";

export class ngaupdater extends plugin {
  constructor() {
    super({
      name: "测试更新nga攻略",
      event: "message",
      priority: 400,
      rule: [
        {
          reg: "^#?nga攻略更新$",
          fnc: "update",
        },
        {
          reg: "^#?nga更新[0-7]$",
          fnc: "getwiki_test",
        },
      ],
    });
    this.mdPath = `${mdPath}`;
    this.verFile = `${pluginRoot}version`;
    this.changeLogFile = `${pluginRoot}changelog`;
    if (!fs.existsSync(this.mdPath)) {
      fs.mkdirSync(this.mdPath);
    }
    this.last_ts = fs.existsSync(this.verFile)
      ? fs.readFileSync(this.verFile, "utf8")
      : "";
    this.urls = {
      homepage: "https://nga.178.com/read.php?tid=27859119", //主页
      wikis: [
        "https://nga.178.com/read.php?pid=635739983", //岩
        "https://nga.178.com/read.php?pid=635740877", //火
        "https://nga.178.com/read.php?pid=635741997", //水
        "https://nga.178.com/read.php?pid=635742419", //冰
        "https://nga.178.com/read.php?pid=635742911", //风
        "https://nga.178.com/read.php?pid=635743435", //雷
        "https://nga.178.com/read.php?pid=635744974", //草
        "https://nga.178.com/read.php?pid=635745349", //旅行者
      ],
    };
  }

  wait(ms) {
    while (ms) {
      ms--;
    }
  }

  async cleanOldImgs() {
    let bashcmd = `rm ${path.join(yunzaiWikiPath, "0/")}/*.jpg `;
    exec(bashcmd);
  }

  async getinfo() {
    await puppeteer.browserInit();

    if (!puppeteer.browser) return false;

    const page = await puppeteer.browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1"
    );
    await page.setViewport({
      width: 1280,
      height: 960,
      isMobile: false,
    });
    await page.goto(this.urls.homepage, { waitUntil: "networkidle0" });

    let _info = await page.evaluate(() => {
      let divChangeLog = document.getElementById("postcontent0").children[0];
      for (let m of divChangeLog.children) {
        if (m.className === "collapse_btn") {
          m.children[0].click();
        }
      }
      let _timestamp = document
        .getElementById("alertc0")
        .children[0].innerText.replace(/在(.*?)修改/g, "$1")
        .replace(/[:\s]/g, "-");
      let _changeLog = divChangeLog.innerText
        .replace(/\n\n^− (更新|修订)部分 .*?$/gm, "")
        .replace(/^([0-9\.]+)\s+更新日志.*?\n\n/g, "");
      return { ts: _timestamp, changelog: _changeLog };
    });
    if (puppeteer.browser) {
      await puppeteer.browser.close().catch((err) => logger.error(err));
    }
    puppeteer.browser = false;

    return _info;
  }

  async _getwikis(_url) {
    await puppeteer.browserInit();

    if (!puppeteer.browser) return false;

    const page = await puppeteer.browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1"
    );
    await page.setViewport({
      width: 1280,
      height: 960,
      isMobile: false,
    });
    await page.goto(_url, { waitUntil: "networkidle0" });
    for (let i = 0; i < 2000; i++) {}

    let eles = await page.evaluate(() => {
      function regex_text(innerText) {
        if (!innerText.includes("\n")) {
          return "";
        }
        let md = innerText;
        var rolename = /^[一二三四五六七八九十]+、(.*)/gm.exec(md)[1];
        if (rolename.includes("旅行者")) {
          rolename = rolename.replace(/^旅行者\((.*?)\)/, "$1主");
        }
        md = md.replace(/\/\* bbscode(.*?)\*\//gm, "");
        md = md.replace(/^[一二三四五六七八九十]+、(.*)/gm, "# $1");
        md = md.replace(
          /^(圣遗物有效词条|圣遗物对应属性|圣遗物套装|推荐武器)：?(.*?)$/gm,
          "## $1  \n- $2  "
        );
        md = md.replace(/^-[ ]{2,}$/gm, "");
        md = md.replace(/([三四五])星武器(：{0,})$/gm, "### $1星武器  \n");
        md = md.replace(/^[\d]+.(.*)$/gm, "- $1  \n");
        md = md.replace(/^\*/gm, "\\* ");
        md = md.replace(/^([^-#\n])(.*?)$/gm, "> $1$2  ");
        md = md.replace(/([>#].*?\n)(^[-#])/gm, "$1\n$2");
        md = md + "\n\n- #####";
        md = md.replace(
          /(-.*?)\n{1,2}(>.*?)\n{1,2}([-#])/gm,
          "$1\n\n  $2\n\n$3"
        );
        md = md.replace(
          /(-.*?)\n{1,2}(>.*?)\n{1,2}([-#])/gm,
          "$1\n\n  $2\n\n$3"
        );
        md = md.replace(/(\s*\n)+^- #####$/gm, "\n");
        md = md.replace(/\n\n\n/gm, "\n\n");
        return { name: rolename, md: md };
      }

      let nga_wikis = [];

      for (let btn of document.querySelectorAll("button")) {
        btn.click();
        cw = btn.parentElement.nextElementSibling;
        if (cw.className === "collapse_content ubbcode") {
          md_obj = regex_text(cw.innerText);
          if (md_obj === "") {
            continue;
          }
          nga_wikis.push(md_obj);
        }
      }
      return nga_wikis;
    });
    await eles.forEach(async (element) => {
      fs.writeFileSync(`${this.mdPath}${element.name}.md`, element.md);
    });
    if (puppeteer.browser) {
      await puppeteer.browser.close().catch((err) => logger.error(err));
    }
    puppeteer.browser = false;
  }

  async cleanOldImgs() {
    let bashcmd = `rm ${path.join(yunzaiWikiPath, "0/")}*.jpg `;
    exec(bashcmd);
  }

  async update() {
    this.info = await this.getinfo(this.urls.homepage);
    if (!(this.last_ts == this.info.ts)) {
      this.e.reply(`${this.last_ts}=>${this.info.ts}`);
      this.e.reply(this.info.changelog);
      for (let i = 0; i < this.urls.wikis.length; i++) {
        await this._getwikis(this.urls.wikis[i]);
        this.e.reply(`${this.urls.wikis[i]} done!`);
      }
      fs.writeFileSync(this.verFile, this.info.ts, "utf8");
      fs.writeFileSync(this.changeLogFile, this.info.changelog, "utf8");
      this.cleanOldImgs();
    } else {
      this.e.reply("no update");
    }
  }

  async getwiki_test() {
    let match = /^#?nga更新([0-7])$/.exec(this.e.msg);
    let url_id = match[1];
    await this._getwikis(this.urls.wikis[url_id]);
    this.e.reply("done!");
  }
}
