(() => {
  window.AiPlatformPoC = window.AiPlatformPoC || {};
  
  const strategies = [];

  function register(strategy) {
    strategies.push(strategy);
  }

  function getStrategy() {
    const hostname = window.location.hostname.replace('www.', '');
    return strategies.find(s => s.matches(hostname));
  }

  window.AiPlatformPoC.PlatformManager = { register, getStrategy };
})();