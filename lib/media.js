import {readFileSync} from 'node:fs';
const manifest=JSON.parse(readFileSync(new URL('./media-manifest.json',import.meta.url),'utf8'));
export function optimizeMedia(item){
 const path=item.large||item.url||'';const match=/^\/photos\/([a-z0-9-]+)-(?:640|1100|1440)\.webp$/.exec(path);const photo=match&&manifest[match[1]];
 if(!photo){
  const match=/^\/media\/([a-f0-9-]{36})$/.exec(path);if(!match||item.type!=='image')return item;const url='/media/'+match[1];
  return {...item,url:url+'?w=480&format=webp',large:url+'?w=2560&format=webp',thumbnail:url+'?w=96&format=webp',srcset:[320,480,768,1280].map(w=>`${url}?w=${w}&format=webp ${w}w`).join(', '),avifSrcset:''};
 }

 const variants=photo.variants.filter(v=>v.width>=320),fallback=variants.find(v=>v.width>=480)||variants.at(-1);
 return {...item,url:fallback.webp,large:photo.original,width:photo.width,height:photo.height,thumbnail:photo.variants[0].webp,srcset:variants.map(v=>`${v.webp} ${v.width}w`).join(', '),avifSrcset:variants.map(v=>`${v.avif} ${v.width}w`).join(', ')};
}
export const imageSizes='(max-width: 760px) 100vw, 620px';
export async function transformImage(file,width,format){
 if(!file.mime.startsWith('image/'))return file;
 const allowed=[96,320,480,768,1280,2560];if(!allowed.includes(width)||!['avif','webp'].includes(format))throw Object.assign(new Error('Ukubwa wa picha si halali.'),{status:400});
 const {default:sharp}=await import('sharp');let image=sharp(Buffer.from(file.data),{limitInputPixels:80000000,failOn:'error'}).rotate().resize({width,withoutEnlargement:true});
 const data=await(format==='avif'?image.avif({quality:52,effort:4}):image.webp({quality:78,effort:2})).toBuffer();return {...file,data,mime:'image/'+format};
}
