import { logo } from "./brand";
export const bootMarkup = `  <div id="boot-background" class="boot-background"><div class="boot-white"></div></div>
  <header class="brand"><h1>DataRocks</h1><div>SYNTHESIZE INFORMATION</div><p>ANALYSIS <b>OS</b></p></header>
  <section id="boot" class="boot" aria-label="系统启动">
    <div class="access-text">ACCESS</div>
    <div class="boot-logo">${logo}</div>
    <div class="auth-status"><span>▪</span> <span id="auth-message"></span><i></i></div>
    <div class="scan"><svg viewBox="0 0 1920 1080" aria-hidden="true"><g fill="none" stroke="#080a08" stroke-width="2" stroke-linecap="round"><path/><path stroke="#fff"/><path/><path/><path/><path/><circle class="orbit-dot" r="8" fill="#ed821b" stroke="none"/><circle class="orbit-dot" r="8" fill="#ed821b" stroke="none"/><circle class="scan-core" cx="960" cy="540" r="5" fill="#080a08" stroke="none"/></g></svg><span>PERMISSION AUTHORIZED</span></div>
    <div class="welcome"><div class="welcome-panel"></div><div class="welcome-heading">WELCOME TO</div><div class="welcome-company"><strong>DataRocks.LLC.</strong><strong class="welcome-highlight" aria-hidden="true">DataRocks.LLC.</strong></div><div class="welcome-database">INTERNAL DATABASE</div><div class="welcome-logo">${logo}</div></div>
  </section>  <div class="powered">POWERED BY <b>DataRocks</b><i></i></div>
`;
