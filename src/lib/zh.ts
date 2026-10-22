// Chinese ⇄ English keyword dictionary for icon search (ported from the prototype).
const DICT = `首页/主页/家/房子=home 设置/设定/齿轮=settings 搜索/查找/放大镜=search 用户/人/个人/头像/账户/账号=user 用户组/团队/群组=users 菜单/汉堡=menu 关闭/叉/取消=x 添加/加/新增/加号=plus 减/减号=minus 删除/垃圾桶/回收站=trash 编辑/修改/铅笔=pencil 保存=save 下载=download 上传=upload 分享=share 复制=copy 粘贴=clipboard 剪切=scissors 链接=link 星/星星/收藏/评分=star 心/喜欢/爱心/点赞=heart 赞/大拇指=thumbs-up 对/勾/完成/确认/正确=check 错误/警告/注意=alert 信息/提示=info 帮助/问号/疑问=help 锁/锁定/安全=lock 解锁=unlock 钥匙/密钥=key 盾/防护=shield 眼睛/查看/可见/显示=eye 隐藏/不可见=eye-off 邮件/邮箱/信封=mail 消息/聊天/对话/评论=message 电话/手机号=phone 手机/移动端=smartphone 电脑/显示器/桌面=monitor 笔记本=laptop 平板=tablet 日历/日期=calendar 时间/时钟/钟=clock 闹钟=alarm 定时/计时器/沙漏=timer 地图=map 位置/定位/地点/坐标=map-pin 导航/指南针=compass 地球/全球/网络/国际/语言=globe 云/云端=cloud 太阳/白天/晴=sun 月亮/夜间/暗色/深色=moon 雨/下雨=cloud-rain 雪=snowflake 闪电/快速=zap 火/热门/火焰=flame 水滴/水=droplet 风=wind 温度/温度计=thermometer 图片/照片/图像=image 相机/拍照/摄像=camera 视频/影片=video 音乐/音符=music 播放=play 暂停=pause 停止=square 下一首=skip-forward 上一首=skip-back 音量/声音/喇叭=volume 静音=volume-x 麦克风/话筒/录音=mic 耳机=headphones 文件/文档=file 文件夹/目录=folder 书/书籍/阅读=book 书签=bookmark 标签/价签=tag 笔记/记事本=notebook 列表/清单=list 网格/宫格=grid 布局/仪表盘/控制台=layout-dashboard 图表/统计/数据=chart 柱状图=bar-chart 饼图=pie-chart 趋势/增长/上涨=trending-up 下跌/下降=trending-down 购物车/购物/商城=shopping-cart 购物袋/包=shopping-bag 礼物/礼品=gift 钱/金钱/美元/价格=dollar 钱包=wallet 信用卡/银行卡/支付/付款=credit-card 银行=landmark 发票/账单/收据=receipt 箭头=arrow 上/向上=arrow-up 下/向下=arrow-down 左/向左/返回/后退=arrow-left 右/向右/前进=arrow-right 刷新/重新加载/同步=refresh 撤销=undo 重做=redo 退出/登出=log-out 登录=log-in 外部/新窗口=external-link 展开/全屏=maximize 收起/缩小=minimize 筛选/过滤/漏斗=filter 排序=arrow-up-down 更多/省略=more 铃铛/通知/提醒=bell 旗帜/举报=flag 奖杯/冠军=trophy 奖章/徽章=award 皇冠/会员=crown 火箭/发布/启动=rocket 灯泡/想法/创意=lightbulb 魔法/魔棒/智能/AI=wand 星光/闪光=sparkles 机器人=bot 代码/编程=code 终端/命令行=terminal 数据库=database 服务器=server 芯片/处理器=cpu 电池/电量=battery 无线/网络信号=wifi 蓝牙=bluetooth 电源/开关=power 插头=plug 二维码=qr-code 条形码/扫码=scan 打印/打印机=printer 工具/扳手/维修=wrench 锤子=hammer 画笔/刷子=brush 调色板/颜色=palette 剪刀=scissors 尺子=ruler 图层=layers 裁剪=crop 旋转=rotate 对齐=align 字体/文字=type 粗体=bold 斜体=italic 下划线=underline 汽车/车=car 公交/巴士=bus 火车/地铁=train 飞机/航班=plane 自行车/单车=bike 船=ship 卡车/货车/物流/快递=truck 咖啡=coffee 食物/餐饮/餐厅=utensils 披萨=pizza 苹果/水果=apple 啤酒=beer 蛋糕/生日=cake 医院/医疗=hospital 药/药丸=pill 健康/心跳=heart-pulse 运动/健身/哑铃=dumbbell 狗=dog 猫=cat 鱼=fish 鸟=bird 树/树木=tree 花=flower 叶子/环保/植物=leaf 山/山峰=mountain 建筑/大楼/公司=building 商店/店铺=store 学校/教育/毕业=graduation-cap 工作/公文包=briefcase 游戏/手柄=gamepad 骰子=dice 拼图/插件=puzzle 地址簿/联系人=contact 微信=wechat 微博=weibo 支付宝=alipay QQ/qq=qq 抖音=tiktok 哔哩哔哩/B站/b站=bilibili 知乎=zhihu 淘宝=taobao 钉钉=dingtalk 飞书=lark 谷歌=google 苹果公司=apple 微软=microsoft 推特=twitter 脸书=facebook 油管=youtube 领英=linkedin`

export const ZH: Record<string, string> = {}
export const ZHR: Record<string, string> = {}
for (const x of DICT.split(/\s+/)) {
  const [k, v] = x.split('=')
  if (!k || !v) continue
  const zs = k.split('/')
  zs.forEach(z => { ZH[z] = v })
  if (!ZHR[v]) ZHR[v] = zs.reduce((a, b) => (b.length > a.length ? b : a))
}

Object.assign(ZHR, { outline: '线性', outlined: '线性', line: '线性', linear: '线性', fill: '面性', filled: '面性', solid: '面性', bold: '粗', duotone: '双色', twotone: '双色', round: '圆角', rounded: '圆角', sharp: '直角', circle: '圆形', square: '方形', off: '关闭', alt: '变体' })

const STYLE_WORDS = ['线性', '面性', '粗', '双色', '圆角', '直角', '圆形', '方形', '变体']

/** English icon name → short Chinese meaning, e.g. "arrow-left" → "箭头 · 左". */
export function en2zh(n?: string): string {
  if (!n) return ''
  if (ZHR[n]) return ZHR[n]
  const tk = n.split(/[-_]/).filter(x => !/^\d+$/.test(x))
  const out: string[] = []
  for (let i = 0; i < tk.length; i++) {
    const two = `${tk[i]}-${tk[i + 1]}`
    if (tk[i + 1] && ZHR[two]) { out.push(ZHR[two]); i++ }
    else if (ZHR[tk[i]]) out.push(ZHR[tk[i]])
  }
  return out.length && out.some(x => !STYLE_WORDS.includes(x)) ? out.join(' · ') : ''
}

/** Chinese query → English keyword. null = not Chinese, '' = unknown word. */
export function zh2en(q: string): string | null {
  if (!q || !/[\u4e00-\u9fff]/.test(q)) return null
  if (ZH[q]) return ZH[q]
  let best = ''
  for (const k in ZH) if (q.includes(k) && k.length > best.length) best = k
  return best ? ZH[best] : ''
}
