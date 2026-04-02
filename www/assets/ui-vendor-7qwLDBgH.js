import{r as f}from"./react-vendor-DTRugvO5.js";let mt={data:""},ht=t=>{if(typeof window=="object"){let e=(t?t.querySelector("#_goober"):window._goober)||Object.assign(document.createElement("style"),{innerHTML:" ",id:"_goober"});return e.nonce=window.__nonce__,e.parentNode||(t||document.head).appendChild(e),e.firstChild}return t||mt},gt=/(?:([\u0080-\uFFFF\w-%@]+) *:? *([^{;]+?);|([^;}{]*?) *{)|(}\s*)/g,pt=/\/\*[^]*?\*\/|  +/g,z=/\n+/g,P=(t,e)=>{let n="",r="",a="";for(let o in t){let i=t[o];o[0]=="@"?o[1]=="i"?n=o+" "+i+";":r+=o[1]=="f"?P(i,o):o+"{"+P(i,o[1]=="k"?"":e)+"}":typeof i=="object"?r+=P(i,e?e.replace(/([^,])+/g,s=>o.replace(/([^,]*:\S+\([^)]*\))|([^,])+/g,u=>/&/.test(u)?u.replace(/&/g,s):s?s+" "+u:u)):o):i!=null&&(o=/^--/.test(o)?o:o.replace(/[A-Z]/g,"-$&").toLowerCase(),a+=P.p?P.p(o,i):o+":"+i+";")}return n+(e&&a?e+"{"+a+"}":a)+r},v={},et=t=>{if(typeof t=="object"){let e="";for(let n in t)e+=n+et(t[n]);return e}return t},yt=(t,e,n,r,a)=>{let o=et(t),i=v[o]||(v[o]=(u=>{let l=0,d=11;for(;l<u.length;)d=101*d+u.charCodeAt(l++)>>>0;return"go"+d})(o));if(!v[i]){let u=o!==t?t:(l=>{let d,c,h=[{}];for(;d=gt.exec(l.replace(pt,""));)d[4]?h.shift():d[3]?(c=d[3].replace(z," ").trim(),h.unshift(h[0][c]=h[0][c]||{})):h[0][d[1]]=d[2].replace(z," ").trim();return h[0]})(t);v[i]=P(a?{["@keyframes "+i]:u}:u,n?"":"."+i)}let s=n&&v.g?v.g:null;return n&&(v.g=v[i]),((u,l,d,c)=>{c?l.data=l.data.replace(c,u):l.data.indexOf(u)===-1&&(l.data=d?u+l.data:l.data+u)})(v[i],e,r,s),i},bt=(t,e,n)=>t.reduce((r,a,o)=>{let i=e[o];if(i&&i.call){let s=i(n),u=s&&s.props&&s.props.className||/^go/.test(s)&&s;i=u?"."+u:s&&typeof s=="object"?s.props?"":P(s,""):s===!1?"":s}return r+a+(i??"")},"");function $(t){let e=this||{},n=t.call?t(e.p):t;return yt(n.unshift?n.raw?bt(n,[].slice.call(arguments,1),e.p):n.reduce((r,a)=>Object.assign(r,a&&a.call?a(e.p):a),{}):n,ht(e.target),e.g,e.o,e.k)}let nt,Q,R;$.bind({g:1});let x=$.bind({k:1});function wt(t,e,n,r){P.p=e,nt=t,Q=n,R=r}function k(t,e){let n=this||{};return function(){let r=arguments;function a(o,i){let s=Object.assign({},o),u=s.className||a.className;n.p=Object.assign({theme:Q&&Q()},s),n.o=/ *go\d+/.test(u),s.className=$.apply(n,r)+(u?" "+u:"");let l=t;return t[0]&&(l=s.as||t,delete s.as),R&&l[0]&&R(s),nt(l,s)}return a}}var vt=t=>typeof t=="function",j=(t,e)=>vt(t)?t(e):t,xt=(()=>{let t=0;return()=>(++t).toString()})(),rt=(()=>{let t;return()=>{if(t===void 0&&typeof window<"u"){let e=matchMedia("(prefers-reduced-motion: reduce)");t=!e||e.matches}return t}})(),Ot=20,X="default",at=(t,e)=>{let{toastLimit:n}=t.settings;switch(e.type){case 0:return{...t,toasts:[e.toast,...t.toasts].slice(0,n)};case 1:return{...t,toasts:t.toasts.map(i=>i.id===e.toast.id?{...i,...e.toast}:i)};case 2:let{toast:r}=e;return at(t,{type:t.toasts.find(i=>i.id===r.id)?1:0,toast:r});case 3:let{toastId:a}=e;return{...t,toasts:t.toasts.map(i=>i.id===a||a===void 0?{...i,dismissed:!0,visible:!1}:i)};case 4:return e.toastId===void 0?{...t,toasts:[]}:{...t,toasts:t.toasts.filter(i=>i.id!==e.toastId)};case 5:return{...t,pausedAt:e.time};case 6:let o=e.time-(t.pausedAt||0);return{...t,pausedAt:void 0,toasts:t.toasts.map(i=>({...i,pauseDuration:i.pauseDuration+o}))}}},N=[],ot={toasts:[],pausedAt:void 0,settings:{toastLimit:Ot}},w={},it=(t,e=X)=>{w[e]=at(w[e]||ot,t),N.forEach(([n,r])=>{n===e&&r(w[e])})},st=t=>Object.keys(w).forEach(e=>it(t,e)),Pt=t=>Object.keys(w).find(e=>w[e].toasts.some(n=>n.id===t)),H=(t=X)=>e=>{it(e,t)},kt={blank:4e3,error:4e3,success:2e3,loading:1/0,custom:4e3},Mt=(t={},e=X)=>{let[n,r]=f.useState(w[e]||ot),a=f.useRef(w[e]);f.useEffect(()=>(a.current!==w[e]&&r(w[e]),N.push([e,r]),()=>{let i=N.findIndex(([s])=>s===e);i>-1&&N.splice(i,1)}),[e]);let o=n.toasts.map(i=>{var s,u,l;return{...t,...t[i.type],...i,removeDelay:i.removeDelay||((s=t[i.type])==null?void 0:s.removeDelay)||t?.removeDelay,duration:i.duration||((u=t[i.type])==null?void 0:u.duration)||t?.duration||kt[i.type],style:{...t.style,...(l=t[i.type])==null?void 0:l.style,...i.style}}});return{...n,toasts:o}},Dt=(t,e="blank",n)=>({createdAt:Date.now(),visible:!0,dismissed:!1,type:e,ariaProps:{role:"status","aria-live":"polite"},message:t,pauseDuration:0,...n,id:n?.id||xt()}),Y=t=>(e,n)=>{let r=Dt(e,t,n);return H(r.toasterId||Pt(r.id))({type:2,toast:r}),r.id},g=(t,e)=>Y("blank")(t,e);g.error=Y("error");g.success=Y("success");g.loading=Y("loading");g.custom=Y("custom");g.dismiss=(t,e)=>{let n={type:3,toastId:t};e?H(e)(n):st(n)};g.dismissAll=t=>g.dismiss(void 0,t);g.remove=(t,e)=>{let n={type:4,toastId:t};e?H(e)(n):st(n)};g.removeAll=t=>g.remove(void 0,t);g.promise=(t,e,n)=>{let r=g.loading(e.loading,{...n,...n?.loading});return typeof t=="function"&&(t=t()),t.then(a=>{let o=e.success?j(e.success,a):void 0;return o?g.success(o,{id:r,...n,...n?.success}):g.dismiss(r),a}).catch(a=>{let o=e.error?j(e.error,a):void 0;o?g.error(o,{id:r,...n,...n?.error}):g.dismiss(r)}),t};var Wt=1e3,Et=(t,e="default")=>{let{toasts:n,pausedAt:r}=Mt(t,e),a=f.useRef(new Map).current,o=f.useCallback((c,h=Wt)=>{if(a.has(c))return;let p=setTimeout(()=>{a.delete(c),i({type:4,toastId:c})},h);a.set(c,p)},[]);f.useEffect(()=>{if(r)return;let c=Date.now(),h=n.map(p=>{if(p.duration===1/0)return;let C=(p.duration||0)+p.pauseDuration-(c-p.createdAt);if(C<0){p.visible&&g.dismiss(p.id);return}return setTimeout(()=>g.dismiss(p.id,e),C)});return()=>{h.forEach(p=>p&&clearTimeout(p))}},[n,r,e]);let i=f.useCallback(H(e),[e]),s=f.useCallback(()=>{i({type:5,time:Date.now()})},[i]),u=f.useCallback((c,h)=>{i({type:1,toast:{id:c,height:h}})},[i]),l=f.useCallback(()=>{r&&i({type:6,time:Date.now()})},[r,i]),d=f.useCallback((c,h)=>{let{reverseOrder:p=!1,gutter:C=8,defaultPosition:B}=h||{},L=n.filter(b=>(b.position||B)===(c.position||B)&&b.height),ft=L.findIndex(b=>b.id===c.id),G=L.filter((b,A)=>A<ft&&b.visible).length;return L.filter(b=>b.visible).slice(...p?[G+1]:[0,G]).reduce((b,A)=>b+(A.height||0)+C,0)},[n]);return f.useEffect(()=>{n.forEach(c=>{if(c.dismissed)o(c.id,c.removeDelay);else{let h=a.get(c.id);h&&(clearTimeout(h),a.delete(c.id))}})},[n,o]),{toasts:n,handlers:{updateHeight:u,startPause:s,endPause:l,calculateOffset:d}}},St=x`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
 transform: scale(1) rotate(45deg);
  opacity: 1;
}`,Tt=x`
from {
  transform: scale(0);
  opacity: 0;
}
to {
  transform: scale(1);
  opacity: 1;
}`,Yt=x`
from {
  transform: scale(0) rotate(90deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(90deg);
	opacity: 1;
}`,Ct=k("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${t=>t.primary||"#ff4b4b"};
  position: relative;
  transform: rotate(45deg);

  animation: ${St} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;

  &:after,
  &:before {
    content: '';
    animation: ${Tt} 0.15s ease-out forwards;
    animation-delay: 150ms;
    position: absolute;
    border-radius: 3px;
    opacity: 0;
    background: ${t=>t.secondary||"#fff"};
    bottom: 9px;
    left: 4px;
    height: 2px;
    width: 12px;
  }

  &:before {
    animation: ${Yt} 0.15s ease-out forwards;
    animation-delay: 180ms;
    transform: rotate(90deg);
  }
`,Ft=x`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`,Nt=k("div")`
  width: 12px;
  height: 12px;
  box-sizing: border-box;
  border: 2px solid;
  border-radius: 100%;
  border-color: ${t=>t.secondary||"#e0e0e0"};
  border-right-color: ${t=>t.primary||"#616161"};
  animation: ${Ft} 1s linear infinite;
`,jt=x`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(45deg);
	opacity: 1;
}`,qt=x`
0% {
	height: 0;
	width: 0;
	opacity: 0;
}
40% {
  height: 0;
	width: 6px;
	opacity: 1;
}
100% {
  opacity: 1;
  height: 10px;
}`,$t=k("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${t=>t.primary||"#61d345"};
  position: relative;
  transform: rotate(45deg);

  animation: ${jt} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;
  &:after {
    content: '';
    box-sizing: border-box;
    animation: ${qt} 0.2s ease-out forwards;
    opacity: 0;
    animation-delay: 200ms;
    position: absolute;
    border-right: 2px solid;
    border-bottom: 2px solid;
    border-color: ${t=>t.secondary||"#fff"};
    bottom: 6px;
    left: 6px;
    height: 10px;
    width: 6px;
  }
`,Ht=k("div")`
  position: absolute;
`,_t=k("div")`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 20px;
  min-height: 20px;
`,Lt=x`
from {
  transform: scale(0.6);
  opacity: 0.4;
}
to {
  transform: scale(1);
  opacity: 1;
}`,At=k("div")`
  position: relative;
  transform: scale(0.6);
  opacity: 0.4;
  min-width: 20px;
  animation: ${Lt} 0.3s 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
`,It=({toast:t})=>{let{icon:e,type:n,iconTheme:r}=t;return e!==void 0?typeof e=="string"?f.createElement(At,null,e):e:n==="blank"?null:f.createElement(_t,null,f.createElement(Nt,{...r}),n!=="loading"&&f.createElement(Ht,null,n==="error"?f.createElement(Ct,{...r}):f.createElement($t,{...r})))},Qt=t=>`
0% {transform: translate3d(0,${t*-200}%,0) scale(.6); opacity:.5;}
100% {transform: translate3d(0,0,0) scale(1); opacity:1;}
`,Rt=t=>`
0% {transform: translate3d(0,0,-1px) scale(1); opacity:1;}
100% {transform: translate3d(0,${t*-150}%,-1px) scale(.6); opacity:0;}
`,Xt="0%{opacity:0;} 100%{opacity:1;}",Bt="0%{opacity:1;} 100%{opacity:0;}",Gt=k("div")`
  display: flex;
  align-items: center;
  background: #fff;
  color: #363636;
  line-height: 1.3;
  will-change: transform;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1), 0 3px 3px rgba(0, 0, 0, 0.05);
  max-width: 350px;
  pointer-events: auto;
  padding: 8px 10px;
  border-radius: 8px;
`,zt=k("div")`
  display: flex;
  justify-content: center;
  margin: 4px 10px;
  color: inherit;
  flex: 1 1 auto;
  white-space: pre-line;
`,Vt=(t,e)=>{let n=t.includes("top")?1:-1,[r,a]=rt()?[Xt,Bt]:[Qt(n),Rt(n)];return{animation:e?`${x(r)} 0.35s cubic-bezier(.21,1.02,.73,1) forwards`:`${x(a)} 0.4s forwards cubic-bezier(.06,.71,.55,1)`}},Jt=f.memo(({toast:t,position:e,style:n,children:r})=>{let a=t.height?Vt(t.position||e||"top-center",t.visible):{opacity:0},o=f.createElement(It,{toast:t}),i=f.createElement(zt,{...t.ariaProps},j(t.message,t));return f.createElement(Gt,{className:t.className,style:{...a,...n,...t.style}},typeof r=="function"?r({icon:o,message:i}):f.createElement(f.Fragment,null,o,i))});wt(f.createElement);var Ut=({id:t,className:e,style:n,onHeightUpdate:r,children:a})=>{let o=f.useCallback(i=>{if(i){let s=()=>{let u=i.getBoundingClientRect().height;r(t,u)};s(),new MutationObserver(s).observe(i,{subtree:!0,childList:!0,characterData:!0})}},[t,r]);return f.createElement("div",{ref:o,className:e,style:n},a)},Kt=(t,e)=>{let n=t.includes("top"),r=n?{top:0}:{bottom:0},a=t.includes("center")?{justifyContent:"center"}:t.includes("right")?{justifyContent:"flex-end"}:{};return{left:0,right:0,display:"flex",position:"absolute",transition:rt()?void 0:"all 230ms cubic-bezier(.21,1.02,.73,1)",transform:`translateY(${e*(n?1:-1)}px)`,...r,...a}},Zt=$`
  z-index: 9999;
  > * {
    pointer-events: auto;
  }
`,F=16,sn=({reverseOrder:t,position:e="top-center",toastOptions:n,gutter:r,children:a,toasterId:o,containerStyle:i,containerClassName:s})=>{let{toasts:u,handlers:l}=Et(n,o);return f.createElement("div",{"data-rht-toaster":o||"",style:{position:"fixed",zIndex:9999,top:F,left:F,right:F,bottom:F,pointerEvents:"none",...i},className:s,onMouseEnter:l.startPause,onMouseLeave:l.endPause},u.map(d=>{let c=d.position||e,h=l.calculateOffset(d,{reverseOrder:t,gutter:r,defaultPosition:e}),p=Kt(c,h);return f.createElement(Ut,{id:d.id,key:d.id,onHeightUpdate:l.updateHeight,className:d.visible?Zt:"",style:p},d.type==="custom"?j(d.message,d):a?a(d):f.createElement(Jt,{toast:d,position:c}))}))},cn=g;function y(t){const e=Object.prototype.toString.call(t);return t instanceof Date||typeof t=="object"&&e==="[object Date]"?new t.constructor(+t):typeof t=="number"||e==="[object Number]"||typeof t=="string"||e==="[object String]"?new Date(t):new Date(NaN)}function D(t,e){return t instanceof Date?new t.constructor(e):new Date(e)}const ct=6048e5,te=864e5;let ee={};function _(){return ee}function T(t,e){const n=_(),r=e?.weekStartsOn??e?.locale?.options?.weekStartsOn??n.weekStartsOn??n.locale?.options?.weekStartsOn??0,a=y(t),o=a.getDay(),i=(o<r?7:0)+o-r;return a.setDate(a.getDate()-i),a.setHours(0,0,0,0),a}function q(t){return T(t,{weekStartsOn:1})}function ut(t){const e=y(t),n=e.getFullYear(),r=D(t,0);r.setFullYear(n+1,0,4),r.setHours(0,0,0,0);const a=q(r),o=D(t,0);o.setFullYear(n,0,4),o.setHours(0,0,0,0);const i=q(o);return e.getTime()>=a.getTime()?n+1:e.getTime()>=i.getTime()?n:n-1}function V(t){const e=y(t);return e.setHours(0,0,0,0),e}function J(t){const e=y(t),n=new Date(Date.UTC(e.getFullYear(),e.getMonth(),e.getDate(),e.getHours(),e.getMinutes(),e.getSeconds(),e.getMilliseconds()));return n.setUTCFullYear(e.getFullYear()),+t-+n}function ne(t,e){const n=V(t),r=V(e),a=+n-J(n),o=+r-J(r);return Math.round((a-o)/te)}function re(t){const e=ut(t),n=D(t,0);return n.setFullYear(e,0,4),n.setHours(0,0,0,0),q(n)}function ae(t){return t instanceof Date||typeof t=="object"&&Object.prototype.toString.call(t)==="[object Date]"}function oe(t){if(!ae(t)&&typeof t!="number")return!1;const e=y(t);return!isNaN(Number(e))}function ie(t){const e=y(t),n=D(t,0);return n.setFullYear(e.getFullYear(),0,1),n.setHours(0,0,0,0),n}const se={lessThanXSeconds:{one:"less than a second",other:"less than {{count}} seconds"},xSeconds:{one:"1 second",other:"{{count}} seconds"},halfAMinute:"half a minute",lessThanXMinutes:{one:"less than a minute",other:"less than {{count}} minutes"},xMinutes:{one:"1 minute",other:"{{count}} minutes"},aboutXHours:{one:"about 1 hour",other:"about {{count}} hours"},xHours:{one:"1 hour",other:"{{count}} hours"},xDays:{one:"1 day",other:"{{count}} days"},aboutXWeeks:{one:"about 1 week",other:"about {{count}} weeks"},xWeeks:{one:"1 week",other:"{{count}} weeks"},aboutXMonths:{one:"about 1 month",other:"about {{count}} months"},xMonths:{one:"1 month",other:"{{count}} months"},aboutXYears:{one:"about 1 year",other:"about {{count}} years"},xYears:{one:"1 year",other:"{{count}} years"},overXYears:{one:"over 1 year",other:"over {{count}} years"},almostXYears:{one:"almost 1 year",other:"almost {{count}} years"}},ce=(t,e,n)=>{let r;const a=se[t];return typeof a=="string"?r=a:e===1?r=a.one:r=a.other.replace("{{count}}",e.toString()),n?.addSuffix?n.comparison&&n.comparison>0?"in "+r:r+" ago":r};function I(t){return(e={})=>{const n=e.width?String(e.width):t.defaultWidth;return t.formats[n]||t.formats[t.defaultWidth]}}const ue={full:"EEEE, MMMM do, y",long:"MMMM do, y",medium:"MMM d, y",short:"MM/dd/yyyy"},de={full:"h:mm:ss a zzzz",long:"h:mm:ss a z",medium:"h:mm:ss a",short:"h:mm a"},le={full:"{{date}} 'at' {{time}}",long:"{{date}} 'at' {{time}}",medium:"{{date}}, {{time}}",short:"{{date}}, {{time}}"},fe={date:I({formats:ue,defaultWidth:"full"}),time:I({formats:de,defaultWidth:"full"}),dateTime:I({formats:le,defaultWidth:"full"})},me={lastWeek:"'last' eeee 'at' p",yesterday:"'yesterday at' p",today:"'today at' p",tomorrow:"'tomorrow at' p",nextWeek:"eeee 'at' p",other:"P"},he=(t,e,n,r)=>me[t];function E(t){return(e,n)=>{const r=n?.context?String(n.context):"standalone";let a;if(r==="formatting"&&t.formattingValues){const i=t.defaultFormattingWidth||t.defaultWidth,s=n?.width?String(n.width):i;a=t.formattingValues[s]||t.formattingValues[i]}else{const i=t.defaultWidth,s=n?.width?String(n.width):t.defaultWidth;a=t.values[s]||t.values[i]}const o=t.argumentCallback?t.argumentCallback(e):e;return a[o]}}const ge={narrow:["B","A"],abbreviated:["BC","AD"],wide:["Before Christ","Anno Domini"]},pe={narrow:["1","2","3","4"],abbreviated:["Q1","Q2","Q3","Q4"],wide:["1st quarter","2nd quarter","3rd quarter","4th quarter"]},ye={narrow:["J","F","M","A","M","J","J","A","S","O","N","D"],abbreviated:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],wide:["January","February","March","April","May","June","July","August","September","October","November","December"]},be={narrow:["S","M","T","W","T","F","S"],short:["Su","Mo","Tu","We","Th","Fr","Sa"],abbreviated:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],wide:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]},we={narrow:{am:"a",pm:"p",midnight:"mi",noon:"n",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},abbreviated:{am:"AM",pm:"PM",midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},wide:{am:"a.m.",pm:"p.m.",midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"}},ve={narrow:{am:"a",pm:"p",midnight:"mi",noon:"n",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"},abbreviated:{am:"AM",pm:"PM",midnight:"midnight",noon:"noon",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"},wide:{am:"a.m.",pm:"p.m.",midnight:"midnight",noon:"noon",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"}},xe=(t,e)=>{const n=Number(t),r=n%100;if(r>20||r<10)switch(r%10){case 1:return n+"st";case 2:return n+"nd";case 3:return n+"rd"}return n+"th"},Oe={ordinalNumber:xe,era:E({values:ge,defaultWidth:"wide"}),quarter:E({values:pe,defaultWidth:"wide",argumentCallback:t=>t-1}),month:E({values:ye,defaultWidth:"wide"}),day:E({values:be,defaultWidth:"wide"}),dayPeriod:E({values:we,defaultWidth:"wide",formattingValues:ve,defaultFormattingWidth:"wide"})};function S(t){return(e,n={})=>{const r=n.width,a=r&&t.matchPatterns[r]||t.matchPatterns[t.defaultMatchWidth],o=e.match(a);if(!o)return null;const i=o[0],s=r&&t.parsePatterns[r]||t.parsePatterns[t.defaultParseWidth],u=Array.isArray(s)?ke(s,c=>c.test(i)):Pe(s,c=>c.test(i));let l;l=t.valueCallback?t.valueCallback(u):u,l=n.valueCallback?n.valueCallback(l):l;const d=e.slice(i.length);return{value:l,rest:d}}}function Pe(t,e){for(const n in t)if(Object.prototype.hasOwnProperty.call(t,n)&&e(t[n]))return n}function ke(t,e){for(let n=0;n<t.length;n++)if(e(t[n]))return n}function Me(t){return(e,n={})=>{const r=e.match(t.matchPattern);if(!r)return null;const a=r[0],o=e.match(t.parsePattern);if(!o)return null;let i=t.valueCallback?t.valueCallback(o[0]):o[0];i=n.valueCallback?n.valueCallback(i):i;const s=e.slice(a.length);return{value:i,rest:s}}}const De=/^(\d+)(th|st|nd|rd)?/i,We=/\d+/i,Ee={narrow:/^(b|a)/i,abbreviated:/^(b\.?\s?c\.?|b\.?\s?c\.?\s?e\.?|a\.?\s?d\.?|c\.?\s?e\.?)/i,wide:/^(before christ|before common era|anno domini|common era)/i},Se={any:[/^b/i,/^(a|c)/i]},Te={narrow:/^[1234]/i,abbreviated:/^q[1234]/i,wide:/^[1234](th|st|nd|rd)? quarter/i},Ye={any:[/1/i,/2/i,/3/i,/4/i]},Ce={narrow:/^[jfmasond]/i,abbreviated:/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,wide:/^(january|february|march|april|may|june|july|august|september|october|november|december)/i},Fe={narrow:[/^j/i,/^f/i,/^m/i,/^a/i,/^m/i,/^j/i,/^j/i,/^a/i,/^s/i,/^o/i,/^n/i,/^d/i],any:[/^ja/i,/^f/i,/^mar/i,/^ap/i,/^may/i,/^jun/i,/^jul/i,/^au/i,/^s/i,/^o/i,/^n/i,/^d/i]},Ne={narrow:/^[smtwf]/i,short:/^(su|mo|tu|we|th|fr|sa)/i,abbreviated:/^(sun|mon|tue|wed|thu|fri|sat)/i,wide:/^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i},je={narrow:[/^s/i,/^m/i,/^t/i,/^w/i,/^t/i,/^f/i,/^s/i],any:[/^su/i,/^m/i,/^tu/i,/^w/i,/^th/i,/^f/i,/^sa/i]},qe={narrow:/^(a|p|mi|n|(in the|at) (morning|afternoon|evening|night))/i,any:/^([ap]\.?\s?m\.?|midnight|noon|(in the|at) (morning|afternoon|evening|night))/i},$e={any:{am:/^a/i,pm:/^p/i,midnight:/^mi/i,noon:/^no/i,morning:/morning/i,afternoon:/afternoon/i,evening:/evening/i,night:/night/i}},He={ordinalNumber:Me({matchPattern:De,parsePattern:We,valueCallback:t=>parseInt(t,10)}),era:S({matchPatterns:Ee,defaultMatchWidth:"wide",parsePatterns:Se,defaultParseWidth:"any"}),quarter:S({matchPatterns:Te,defaultMatchWidth:"wide",parsePatterns:Ye,defaultParseWidth:"any",valueCallback:t=>t+1}),month:S({matchPatterns:Ce,defaultMatchWidth:"wide",parsePatterns:Fe,defaultParseWidth:"any"}),day:S({matchPatterns:Ne,defaultMatchWidth:"wide",parsePatterns:je,defaultParseWidth:"any"}),dayPeriod:S({matchPatterns:qe,defaultMatchWidth:"any",parsePatterns:$e,defaultParseWidth:"any"})},_e={code:"en-US",formatDistance:ce,formatLong:fe,formatRelative:he,localize:Oe,match:He,options:{weekStartsOn:0,firstWeekContainsDate:1}};function Le(t){const e=y(t);return ne(e,ie(e))+1}function Ae(t){const e=y(t),n=+q(e)-+re(e);return Math.round(n/ct)+1}function dt(t,e){const n=y(t),r=n.getFullYear(),a=_(),o=e?.firstWeekContainsDate??e?.locale?.options?.firstWeekContainsDate??a.firstWeekContainsDate??a.locale?.options?.firstWeekContainsDate??1,i=D(t,0);i.setFullYear(r+1,0,o),i.setHours(0,0,0,0);const s=T(i,e),u=D(t,0);u.setFullYear(r,0,o),u.setHours(0,0,0,0);const l=T(u,e);return n.getTime()>=s.getTime()?r+1:n.getTime()>=l.getTime()?r:r-1}function Ie(t,e){const n=_(),r=e?.firstWeekContainsDate??e?.locale?.options?.firstWeekContainsDate??n.firstWeekContainsDate??n.locale?.options?.firstWeekContainsDate??1,a=dt(t,e),o=D(t,0);return o.setFullYear(a,0,r),o.setHours(0,0,0,0),T(o,e)}function Qe(t,e){const n=y(t),r=+T(n,e)-+Ie(n,e);return Math.round(r/ct)+1}function m(t,e){const n=t<0?"-":"",r=Math.abs(t).toString().padStart(e,"0");return n+r}const O={y(t,e){const n=t.getFullYear(),r=n>0?n:1-n;return m(e==="yy"?r%100:r,e.length)},M(t,e){const n=t.getMonth();return e==="M"?String(n+1):m(n+1,2)},d(t,e){return m(t.getDate(),e.length)},a(t,e){const n=t.getHours()/12>=1?"pm":"am";switch(e){case"a":case"aa":return n.toUpperCase();case"aaa":return n;case"aaaaa":return n[0];case"aaaa":default:return n==="am"?"a.m.":"p.m."}},h(t,e){return m(t.getHours()%12||12,e.length)},H(t,e){return m(t.getHours(),e.length)},m(t,e){return m(t.getMinutes(),e.length)},s(t,e){return m(t.getSeconds(),e.length)},S(t,e){const n=e.length,r=t.getMilliseconds(),a=Math.trunc(r*Math.pow(10,n-3));return m(a,e.length)}},W={midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},U={G:function(t,e,n){const r=t.getFullYear()>0?1:0;switch(e){case"G":case"GG":case"GGG":return n.era(r,{width:"abbreviated"});case"GGGGG":return n.era(r,{width:"narrow"});case"GGGG":default:return n.era(r,{width:"wide"})}},y:function(t,e,n){if(e==="yo"){const r=t.getFullYear(),a=r>0?r:1-r;return n.ordinalNumber(a,{unit:"year"})}return O.y(t,e)},Y:function(t,e,n,r){const a=dt(t,r),o=a>0?a:1-a;if(e==="YY"){const i=o%100;return m(i,2)}return e==="Yo"?n.ordinalNumber(o,{unit:"year"}):m(o,e.length)},R:function(t,e){const n=ut(t);return m(n,e.length)},u:function(t,e){const n=t.getFullYear();return m(n,e.length)},Q:function(t,e,n){const r=Math.ceil((t.getMonth()+1)/3);switch(e){case"Q":return String(r);case"QQ":return m(r,2);case"Qo":return n.ordinalNumber(r,{unit:"quarter"});case"QQQ":return n.quarter(r,{width:"abbreviated",context:"formatting"});case"QQQQQ":return n.quarter(r,{width:"narrow",context:"formatting"});case"QQQQ":default:return n.quarter(r,{width:"wide",context:"formatting"})}},q:function(t,e,n){const r=Math.ceil((t.getMonth()+1)/3);switch(e){case"q":return String(r);case"qq":return m(r,2);case"qo":return n.ordinalNumber(r,{unit:"quarter"});case"qqq":return n.quarter(r,{width:"abbreviated",context:"standalone"});case"qqqqq":return n.quarter(r,{width:"narrow",context:"standalone"});case"qqqq":default:return n.quarter(r,{width:"wide",context:"standalone"})}},M:function(t,e,n){const r=t.getMonth();switch(e){case"M":case"MM":return O.M(t,e);case"Mo":return n.ordinalNumber(r+1,{unit:"month"});case"MMM":return n.month(r,{width:"abbreviated",context:"formatting"});case"MMMMM":return n.month(r,{width:"narrow",context:"formatting"});case"MMMM":default:return n.month(r,{width:"wide",context:"formatting"})}},L:function(t,e,n){const r=t.getMonth();switch(e){case"L":return String(r+1);case"LL":return m(r+1,2);case"Lo":return n.ordinalNumber(r+1,{unit:"month"});case"LLL":return n.month(r,{width:"abbreviated",context:"standalone"});case"LLLLL":return n.month(r,{width:"narrow",context:"standalone"});case"LLLL":default:return n.month(r,{width:"wide",context:"standalone"})}},w:function(t,e,n,r){const a=Qe(t,r);return e==="wo"?n.ordinalNumber(a,{unit:"week"}):m(a,e.length)},I:function(t,e,n){const r=Ae(t);return e==="Io"?n.ordinalNumber(r,{unit:"week"}):m(r,e.length)},d:function(t,e,n){return e==="do"?n.ordinalNumber(t.getDate(),{unit:"date"}):O.d(t,e)},D:function(t,e,n){const r=Le(t);return e==="Do"?n.ordinalNumber(r,{unit:"dayOfYear"}):m(r,e.length)},E:function(t,e,n){const r=t.getDay();switch(e){case"E":case"EE":case"EEE":return n.day(r,{width:"abbreviated",context:"formatting"});case"EEEEE":return n.day(r,{width:"narrow",context:"formatting"});case"EEEEEE":return n.day(r,{width:"short",context:"formatting"});case"EEEE":default:return n.day(r,{width:"wide",context:"formatting"})}},e:function(t,e,n,r){const a=t.getDay(),o=(a-r.weekStartsOn+8)%7||7;switch(e){case"e":return String(o);case"ee":return m(o,2);case"eo":return n.ordinalNumber(o,{unit:"day"});case"eee":return n.day(a,{width:"abbreviated",context:"formatting"});case"eeeee":return n.day(a,{width:"narrow",context:"formatting"});case"eeeeee":return n.day(a,{width:"short",context:"formatting"});case"eeee":default:return n.day(a,{width:"wide",context:"formatting"})}},c:function(t,e,n,r){const a=t.getDay(),o=(a-r.weekStartsOn+8)%7||7;switch(e){case"c":return String(o);case"cc":return m(o,e.length);case"co":return n.ordinalNumber(o,{unit:"day"});case"ccc":return n.day(a,{width:"abbreviated",context:"standalone"});case"ccccc":return n.day(a,{width:"narrow",context:"standalone"});case"cccccc":return n.day(a,{width:"short",context:"standalone"});case"cccc":default:return n.day(a,{width:"wide",context:"standalone"})}},i:function(t,e,n){const r=t.getDay(),a=r===0?7:r;switch(e){case"i":return String(a);case"ii":return m(a,e.length);case"io":return n.ordinalNumber(a,{unit:"day"});case"iii":return n.day(r,{width:"abbreviated",context:"formatting"});case"iiiii":return n.day(r,{width:"narrow",context:"formatting"});case"iiiiii":return n.day(r,{width:"short",context:"formatting"});case"iiii":default:return n.day(r,{width:"wide",context:"formatting"})}},a:function(t,e,n){const a=t.getHours()/12>=1?"pm":"am";switch(e){case"a":case"aa":return n.dayPeriod(a,{width:"abbreviated",context:"formatting"});case"aaa":return n.dayPeriod(a,{width:"abbreviated",context:"formatting"}).toLowerCase();case"aaaaa":return n.dayPeriod(a,{width:"narrow",context:"formatting"});case"aaaa":default:return n.dayPeriod(a,{width:"wide",context:"formatting"})}},b:function(t,e,n){const r=t.getHours();let a;switch(r===12?a=W.noon:r===0?a=W.midnight:a=r/12>=1?"pm":"am",e){case"b":case"bb":return n.dayPeriod(a,{width:"abbreviated",context:"formatting"});case"bbb":return n.dayPeriod(a,{width:"abbreviated",context:"formatting"}).toLowerCase();case"bbbbb":return n.dayPeriod(a,{width:"narrow",context:"formatting"});case"bbbb":default:return n.dayPeriod(a,{width:"wide",context:"formatting"})}},B:function(t,e,n){const r=t.getHours();let a;switch(r>=17?a=W.evening:r>=12?a=W.afternoon:r>=4?a=W.morning:a=W.night,e){case"B":case"BB":case"BBB":return n.dayPeriod(a,{width:"abbreviated",context:"formatting"});case"BBBBB":return n.dayPeriod(a,{width:"narrow",context:"formatting"});case"BBBB":default:return n.dayPeriod(a,{width:"wide",context:"formatting"})}},h:function(t,e,n){if(e==="ho"){let r=t.getHours()%12;return r===0&&(r=12),n.ordinalNumber(r,{unit:"hour"})}return O.h(t,e)},H:function(t,e,n){return e==="Ho"?n.ordinalNumber(t.getHours(),{unit:"hour"}):O.H(t,e)},K:function(t,e,n){const r=t.getHours()%12;return e==="Ko"?n.ordinalNumber(r,{unit:"hour"}):m(r,e.length)},k:function(t,e,n){let r=t.getHours();return r===0&&(r=24),e==="ko"?n.ordinalNumber(r,{unit:"hour"}):m(r,e.length)},m:function(t,e,n){return e==="mo"?n.ordinalNumber(t.getMinutes(),{unit:"minute"}):O.m(t,e)},s:function(t,e,n){return e==="so"?n.ordinalNumber(t.getSeconds(),{unit:"second"}):O.s(t,e)},S:function(t,e){return O.S(t,e)},X:function(t,e,n){const r=t.getTimezoneOffset();if(r===0)return"Z";switch(e){case"X":return Z(r);case"XXXX":case"XX":return M(r);case"XXXXX":case"XXX":default:return M(r,":")}},x:function(t,e,n){const r=t.getTimezoneOffset();switch(e){case"x":return Z(r);case"xxxx":case"xx":return M(r);case"xxxxx":case"xxx":default:return M(r,":")}},O:function(t,e,n){const r=t.getTimezoneOffset();switch(e){case"O":case"OO":case"OOO":return"GMT"+K(r,":");case"OOOO":default:return"GMT"+M(r,":")}},z:function(t,e,n){const r=t.getTimezoneOffset();switch(e){case"z":case"zz":case"zzz":return"GMT"+K(r,":");case"zzzz":default:return"GMT"+M(r,":")}},t:function(t,e,n){const r=Math.trunc(t.getTime()/1e3);return m(r,e.length)},T:function(t,e,n){const r=t.getTime();return m(r,e.length)}};function K(t,e=""){const n=t>0?"-":"+",r=Math.abs(t),a=Math.trunc(r/60),o=r%60;return o===0?n+String(a):n+String(a)+e+m(o,2)}function Z(t,e){return t%60===0?(t>0?"-":"+")+m(Math.abs(t)/60,2):M(t,e)}function M(t,e=""){const n=t>0?"-":"+",r=Math.abs(t),a=m(Math.trunc(r/60),2),o=m(r%60,2);return n+a+e+o}const tt=(t,e)=>{switch(t){case"P":return e.date({width:"short"});case"PP":return e.date({width:"medium"});case"PPP":return e.date({width:"long"});case"PPPP":default:return e.date({width:"full"})}},lt=(t,e)=>{switch(t){case"p":return e.time({width:"short"});case"pp":return e.time({width:"medium"});case"ppp":return e.time({width:"long"});case"pppp":default:return e.time({width:"full"})}},Re=(t,e)=>{const n=t.match(/(P+)(p+)?/)||[],r=n[1],a=n[2];if(!a)return tt(t,e);let o;switch(r){case"P":o=e.dateTime({width:"short"});break;case"PP":o=e.dateTime({width:"medium"});break;case"PPP":o=e.dateTime({width:"long"});break;case"PPPP":default:o=e.dateTime({width:"full"});break}return o.replace("{{date}}",tt(r,e)).replace("{{time}}",lt(a,e))},Xe={p:lt,P:Re},Be=/^D+$/,Ge=/^Y+$/,ze=["D","DD","YY","YYYY"];function Ve(t){return Be.test(t)}function Je(t){return Ge.test(t)}function Ue(t,e,n){const r=Ke(t,e,n);if(console.warn(r),ze.includes(t))throw new RangeError(r)}function Ke(t,e,n){const r=t[0]==="Y"?"years":"days of the month";return`Use \`${t.toLowerCase()}\` instead of \`${t}\` (in \`${e}\`) for formatting ${r} to the input \`${n}\`; see: https://github.com/date-fns/date-fns/blob/master/docs/unicodeTokens.md`}const Ze=/[yYQqMLwIdDecihHKkms]o|(\w)\1*|''|'(''|[^'])+('|$)|./g,tn=/P+p+|P+|p+|''|'(''|[^'])+('|$)|./g,en=/^'([^]*?)'?$/,nn=/''/g,rn=/[a-zA-Z]/;function un(t,e,n){const r=_(),a=r.locale??_e,o=r.firstWeekContainsDate??r.locale?.options?.firstWeekContainsDate??1,i=r.weekStartsOn??r.locale?.options?.weekStartsOn??0,s=y(t);if(!oe(s))throw new RangeError("Invalid time value");let u=e.match(tn).map(d=>{const c=d[0];if(c==="p"||c==="P"){const h=Xe[c];return h(d,a.formatLong)}return d}).join("").match(Ze).map(d=>{if(d==="''")return{isToken:!1,value:"'"};const c=d[0];if(c==="'")return{isToken:!1,value:an(d)};if(U[c])return{isToken:!0,value:d};if(c.match(rn))throw new RangeError("Format string contains an unescaped latin alphabet character `"+c+"`");return{isToken:!1,value:d}});a.localize.preprocessor&&(u=a.localize.preprocessor(s,u));const l={firstWeekContainsDate:o,weekStartsOn:i,locale:a};return u.map(d=>{if(!d.isToken)return d.value;const c=d.value;(Je(c)||Ve(c))&&Ue(c,e,String(t));const h=U[c[0]];return h(s,c,a.localize,l)}).join("")}function an(t){const e=t.match(en);return e?e[1].replace(nn,"'"):t}export{sn as F,un as f,cn as z};
