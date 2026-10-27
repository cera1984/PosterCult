// SPDX-License-Identifier: MIT
// Phone envelopes: Apple dimensional drawings. Cutout profiles: original preview design.
const rows = [
  ['iPhone 13',71.52,146.70,7.65,10.8,'square',32,33,32.22,52.53],
  ['iPhone 13 Pro',71.52,146.71,7.65,10.8,'square',38,39,32.22,52.53],
  ['iPhone 13 Pro Max',78.07,160.84,7.65,10.8,'square',38,39,32.22,52.53],
  ['iPhone 14',71.52,146.71,7.80,10.8,'square',34,35,32.22,52.53],
  ['iPhone 14 Pro',71.45,147.46,7.85,11.2,'square',40,42,32.22,55.54],
  ['iPhone 14 Pro Max',77.58,160.71,7.85,11.2,'square',40,42,32.22,55.54],
  ['iPhone 15',71.63,147.64,7.81,12,'square',34,35,31.67,53.37],
  ['iPhone 15 Pro',70.60,146.61,8.25,12,'square',40,42,31.67,56.17],
  ['iPhone 15 Pro Max',76.73,159.86,8.25,12,'square',40,42,31.67,56.17],
  ['iPhone 16',71.63,147.64,7.81,12,'vertical',24,44,34.08,55.33,96.23],
  ['iPhone 16 Pro',71.45,149.61,8.25,12,'square',40,42,34.08,55.33,98.19],
  ['iPhone 16 Pro Max',77.58,163.03,8.25,12,'square',40,42,34.08,55.33,111.62],
  ['iPhone 17',71.45,149.61,7.95,12,'vertical',24,44,34.28,55.32,98.20],
  ['iPhone 17 Pro',71.85,150.01,8.75,12,'wide',68,46,34.28,55.53,98.40],
  ['iPhone 17 Pro Max',77.99,163.43,8.75,12,'wide',74,46,34.28,55.53,111.82]
];
export const PHONE_CASE_MODELS = rows.map(([name,width,height,depth,corner,layout,cw,ch,action,power,cameraControl])=>{
  const id=name.toLowerCase().replaceAll(' ','-');
  const camera=layout==='vertical'
    ? [{x:13.62-width/2,y:height/2-22.48,width:cw,height:ch,radius:12},
       {x:30.01-width/2,y:height/2-22.48,width:8,height:8,radius:4}]
    : [{x:layout==='wide'?0:-width/2+cw/2+1.725,y:height/2-ch/2-1.805,width:cw,height:ch,radius:layout==='wide'?10:9}];
  return Object.freeze({name,id,width,height,depth,corner,layout,cameras:camera,
    clearance:.3,wall:1.5,back:1.5,connector:id.startsWith('iphone-13')||id.startsWith('iphone-14')?'Lightning':'USB-C',
    actionButton:(id.includes('15-pro')||/^iphone-(16|17)/.test(id)),
    controls:{action,power,volumeUp:action+14.15,volumeDown:action+28.35,cameraControl},
    source:'https://developer.apple.com/download/files/accessories/dimensional-drawings/'+id+'.pdf',
    asset:'./assets/models/'+id+'-shell.glb?v=all-shells-1'});
});
export const IPHONE_16_PRO = PHONE_CASE_MODELS.find(model=>model.name==='iPhone 16 Pro');
