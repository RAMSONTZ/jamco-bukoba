from pathlib import Path
from PIL import Image, ImageOps
import json,hashlib
root=Path(__file__).resolve().parents[1];out=root/'public/photos/optimized';out.mkdir(parents=True,exist_ok=True)
manifest={};seen={}
for source in sorted((root/'public/photos').glob('*.webp')):
 stem=source.name.rsplit('-',1)[0]
 if stem not in seen or source.stat().st_size>seen[stem].stat().st_size:seen[stem]=source
for stem,source in seen.items():
 # Select the highest pixel count, rather than compressed file size.
 candidates=list((root/'public/photos').glob(stem+'-*.webp'))
 source=max(candidates,key=lambda p:Image.open(p).width*Image.open(p).height)
 image=Image.open(source).convert('RGB');key=hashlib.sha256(source.read_bytes()).hexdigest()[:10];variants=[]
 for width in sorted(set([96,320,480,768,min(1280,image.width)])):
  if width>image.width:continue
  resized=ImageOps.contain(image,(width,10000),Image.Resampling.LANCZOS)
  entry={'width':resized.width,'height':resized.height}
  for fmt,quality in [('webp',72),('avif',52)]:
   dest=out/f'{stem}-{key}-{width}.{fmt}';resized.save(dest,format=fmt.upper(),quality=quality,**({'method':6} if fmt=='webp' else {'speed':6}))
   entry[fmt]='/photos/optimized/'+dest.name;entry[fmt+'Bytes']=dest.stat().st_size
  variants.append(entry)
 manifest[stem]={'width':image.width,'height':image.height,'variants':variants,'original':'/photos/'+source.name}
(root/'lib/media-manifest.json').write_text(json.dumps(manifest,separators=(',',':')))
brand=root/'public/brand';logo=Image.open(brand/'jamco-logo-transparent.png').convert('RGBA');logo.thumbnail((360,360),Image.Resampling.LANCZOS);logo.save(brand/'jamco-logo-display.webp','WEBP',quality=85,method=6)
print(json.dumps({'photos':len(manifest),'generated':len(list(out.iterdir())),'originalLogoBytes':(brand/'jamco-logo-transparent.png').stat().st_size,'displayLogoBytes':(brand/'jamco-logo-display.webp').stat().st_size,'firstPhoto':manifest['aircraft']}))
