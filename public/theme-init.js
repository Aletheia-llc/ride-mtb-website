(function () {
  try {
    var stored = localStorage.getItem('theme')
    if (stored === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark')
    } else if (stored === 'light') {
      document.documentElement.setAttribute('data-theme', 'light')
    } else if (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.setAttribute('data-theme', 'dark')
    }
  } catch (e) {}
})()
