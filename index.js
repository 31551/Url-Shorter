// 项目名，决定html从哪个项目获取，
const github_repo = 'AoEiuV020/Url-Shorten-Worker'
// 项目版本，cdn会有缓存，所以有更新时需要指定版本，
const github_version = '@97d24c3'
// 短链超时，单位毫秒，0表示不设置超时，
const shorten_timeout = 1000 * 60 * 10
// 白名单，写顶级域名就可以，自动通过顶级域名和所有二级域名，
const white_list = [
'aoeiuv020.com',
'aoeiuv020.cn',
'aoeiuv020.cc',
'020.name',
]
const html404 = `<!DOCTYPE html>
<body>
  <h1>404 Not Found.</h1>
  <p>The url you visit is not found.</p>
</body>`


async function randomString(len) {
　　len = len || 6;
　　let $chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678';    /****默认去掉了容易混淆的字符oOLl,9gq,Vv,Uu,I1****/
　　let maxPos = $chars.length;
　　let result = '';
　　for (i = 0; i < len; i++) {
　　　　result += $chars.charAt(Math.floor(Math.random() * maxPos));
　　}
　　return result;
}
async function checkURL(url){
    let str=url;
    let Expression=/^http(s)?:\/\/([\w-]+\.)+[\w-]+(\/[\w\-.\/?%&=]*)?$/;
    let objExp=new RegExp(Expression);
    if(objExp.test(str)==true){
      if (str[0] == 'h')
        return true;
      else
        return false;
    }else{
        return false;
    }
} 
async function save_url(url){
    let random_key=await randomString()
    let is_exist=await LINKS.get(random_key)
    console.log(is_exist)
    if (is_exist == null) {
        let value = `3;${Date.now()};${url}`
        return await LINKS.put(random_key, value),random_key
    }
    else {
        save_url(url)
    }
}
async function handleRequest(request) {
  console.log(request)
  if (request.method === "POST") {
    let req=await request.json()
    console.log(req["url"])
    if(!await checkURL(req["url"])){
    return new Response(`{"status":500,"key":": Error: Url illegal."}`, {
      headers: {
      "content-type": "text/html;charset=UTF-8",
      "Access-Control-Allow-Origin":"*",
      "Access-Control-Allow-Methods": "POST",
      },
    })}
    let stat,random_key=await save_url(req["url"])
    console.log(stat)
    if (typeof(stat) == "undefined"){
      return new Response(`{"status":200,"key":"/`+random_key+`"}`, {
      headers: {
      "content-type": "text/html;charset=UTF-8",
      "Access-Control-Allow-Origin":"*",
      "Access-Control-Allow-Methods": "POST",
      },
    })
    }else{
      return new Response(`{"status":200,"key":": Error:Reach the KV write limitation."}`, {
      headers: {
      "content-type": "text/html;charset=UTF-8",
      "Access-Control-Allow-Origin":"*",
      "Access-Control-Allow-Methods": "POST",
      },
    })}
  }else if(request.method === "OPTIONS"){  
      return new Response(``, {
      headers: {
      "content-type": "text/html;charset=UTF-8",
      "Access-Control-Allow-Origin":"*",
      "Access-Control-Allow-Methods": "POST",
      },
    })

  }

  const requestURL = new URL(request.url)
  const path = requestURL.pathname.split("/")[1]
  console.log(path)
  if(!path){

    const html= await fetch(`https://cdn.jsdelivr.net/gh/${github_repo}${github_version}/index.html`)
    const text = (await html.text())
        .replaceAll("###GITHUB_REPO###", github_repo)
        .replaceAll("###GITHUB_VERSION###", github_version)
    
    return new Response(text, {
    headers: {
      "content-type": "text/html;charset=UTF-8",
    },
  })
  }
  const value = await LINKS.get(path)
  if (!value) {
    // 找不到直接404,
    console.log('not found')
    return new Response(html404, {
      headers: {
        "content-type": "text/html;charset=UTF-8",
      },
      status: 404
    })
  }
  const list = value.split(';')
  console.log(list)
  var url
  if (list.length == 1) {
      // 老数据暂且正常跳转，
      url = list[0]
  } else {
      url = list[2]
      const mode = parseInt(list[0])
      const create_time = parseInt(list[1])
      if (mode != 0 && shorten_timeout > 0
          && Date.now() - create_time > shorten_timeout) {
          const host = new URL(url).host
          if (white_list.some((h) => host == h || host.endsWith('.'+h))) {
              console.log('white list')
          } else {
              // 超时和找不到做同样的处理，
              console.log("shorten timeout")
              return new Response(html404, {
                headers: {
                  "content-type": "text/html;charset=UTF-8",
                },
                status: 404
              })
          }
      }
  }
  return Response.redirect(url, 302)
}



addEventListener("fetch", async event => {
  event.respondWith(handleRequest(event.request))
})
