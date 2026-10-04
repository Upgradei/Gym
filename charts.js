import {displayDate} from './core.js';
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function lineChart(points,label){
 if(!points.length)return '<p class="empty">Log sessions to build this trend.</p>';
 const pts=[...points].sort((a,b)=>a.date.localeCompare(b.date)),ys=pts.map(p=>p.v),xs=pts.map(p=>+new Date(p.date+'T12:00:00'));
 let lo=Math.min(...ys),hi=Math.max(...ys);const pad=Math.max((hi-lo)*.2,1);lo-=pad;hi+=pad;
 const min=Math.min(...xs),max=Math.max(...xs),x=i=>max===min?170:45+(xs[i]-min)/(max-min)*275,y=v=>165-(v-lo)/(hi-lo)*140;
 return `<svg viewBox="0 0 340 205" role="img" aria-label="${esc(label)}"><title>${esc(label)}</title>${[0,1,2,3].map(t=>{const v=lo+(hi-lo)*t/3;return `<line x1="45" x2="320" y1="${y(v)}" y2="${y(v)}" stroke="#282D33"/><text x="38" y="${y(v)+4}" fill="#868D97" font-size="10" text-anchor="end">${+v.toFixed(1)}</text>`;}).join('')}<polyline points="${pts.map((p,i)=>`${x(i)},${y(p.v)}`).join(' ')}" fill="none" stroke="#F2C14A" stroke-width="3"/>${pts.map((p,i)=>`<circle cx="${x(i)}" cy="${y(p.v)}" r="4" fill="#F2C14A"><title>${esc(displayDate(p.date))}: ${p.v}</title></circle>`).join('')}<text x="45" y="195" fill="#868D97" font-size="11">${esc(displayDate(pts[0].date))}</text><text x="320" y="195" fill="#868D97" font-size="11" text-anchor="end">${esc(displayDate(pts.at(-1).date))}</text></svg>`;
}
