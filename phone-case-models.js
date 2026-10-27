// SPDX-License-Identifier: MIT
// Phone envelopes: Apple dimensional drawings. Cutout profiles: original preview design.
const rows = [
  ['iPhone 13',71.52,146.70,7.65,10.8,'square',32,33],
  ['iPhone 13 Pro',71.52,146.71,7.65,10.8,'square',38,39],
  ['iPhone 13 Pro Max',78.07,160.84,7.65,10.8,'square',38,39],
  ['iPhone 14',71.52,146.71,7.80,10.8,'square',34,35],
  ['iPhone 14 Pro',71.45,147.46,7.85,11.2,'square',40,42],
  ['iPhone 14 Pro Max',77.58,160.71,7.85,11.2,'square',40,42],
  ['iPhone 15',71.63,147.64,7.81,12,'square',34,35],
  ['iPhone 15 Pro',70.60,146.61,8.25,12,'square',40,42],
  ['iPhone 15 Pro Max',76.73,159.86,8.25,12,'square',40,42],
  ['iPhone 16',71.63,147.64,7.81,12,'vertical',24,44],
  ['iPhone 16 Pro',71.45,149.61,8.25,12,'square',40,42],
  ['iPhone 16 Pro Max',77.58,163.03,8.25,12,'square',40,42],
  ['iPhone 17',71.45,149.61,7.95,12,'vertical',24,44],
  ['iPhone 17 Pro',71.85,150.01,8.75,12,'wide',68,46],
  ['iPhone 17 Pro Max',77.99,163.43,8.75,12,'wide',74,46]
];
// Independently read centre/pocket-centre ordinates in mm from the TOP edge.
// Columns: mute/Action, volume up, volume down, side button, Camera Control.
// Left/right always mean viewed from the DISPLAY (front), not the printed back.
const buttonCentres = {
  "iphone-13": [32.22, 45.53, 59.53, 52.53],
  "iphone-13-pro": [32.22, 45.53, 59.53, 52.53],
  "iphone-13-pro-max": [32.22, 45.53, 59.53, 52.53],
  "iphone-14": [31.98, 45.43, 59.63, 52.53],
  "iphone-14-pro": [31.14, 44.59, 58.79, 55.54],
  "iphone-14-pro-max": [31.14, 44.59, 58.79, 55.54],
  "iphone-15": [32.83, 46.27, 60.47, 53.37],
  "iphone-15-pro": [31.67, 45.22, 59.42, 56.17],
  "iphone-15-pro-max": [31.67, 45.22, 59.42, 56.17],
  "iphone-16": [34.08, 48.23, 62.43, 55.33, 96.23],
  "iphone-16-pro": [34.08, 48.23, 62.43, 55.33, 98.19],
  "iphone-16-pro-max": [34.08, 48.23, 62.43, 55.33, 111.62],
  "iphone-17": [34.08, 48.23, 62.43, 55.32, 98.20],
  "iphone-17-pro": [34.28, 48.43, 62.63, 55.53, 98.40],
  "iphone-17-pro-max": [34.28, 48.43, 62.63, 55.53, 111.82]
};

export const PHONE_CASE_MODELS = rows.map(([name,width,height,depth,corner,layout,cw,ch])=>{
  const id=name.toLowerCase().replaceAll(' ','-');
  const [action,volumeUp,volumeDown,power,cameraControl]=buttonCentres[id];
  const camera=layout==='vertical'
    ? [{x:13.62-width/2,y:height/2-22.48,width:cw,height:ch,radius:12},
       {x:30.01-width/2,y:height/2-22.48,width:8,height:8,radius:4}]
    : [{x:layout==='wide'?0:-width/2+cw/2+1.725,y:height/2-ch/2-1.805,width:cw,height:ch,radius:layout==='wide'?10:9}];
  return Object.freeze({name,id,width,height,depth,corner,layout,cameras:camera,
    clearance:.3,wall:1.5,back:1.5,connector:id.startsWith('iphone-13')||id.startsWith('iphone-14')?'Lightning':'USB-C',
    actionButton:(id.includes('15-pro')||/^iphone-(16|17)/.test(id)),
    controls:{action,volumeUp,volumeDown,power,cameraControl},
    source:'https://developer.apple.com/download/files/accessories/dimensional-drawings/'+id+'.pdf',
    asset:'./assets/models/'+id+'-shell.glb?v=buttons-audit-1'});
});
export const IPHONE_16_PRO = PHONE_CASE_MODELS.find(model=>model.name==='iPhone 16 Pro');
