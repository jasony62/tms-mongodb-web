const way = process.env.VUE_APP_STORETOKEN_WAY

function getCookie(cname) {
  let name = cname + '='
  let ca = document.cookie.split(';')
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i].trim()
    if (c.indexOf(name) == 0) return c.substring(name.length, c.length)
  }
  return ''
}

function setToken(token) {
  if (way === 'session') {
    sessionStorage.setItem('access_token', token)
  } else {
    let host = window.location.hostname
    document.cookie = `access_token=${token};path=/;domain=${host}`
  }
}

function getToken() {
  if (way === 'session') {
    return sessionStorage.getItem('access_token')
  } else {
    return getCookie('access_token')
  }
}

export { setToken, getToken }
